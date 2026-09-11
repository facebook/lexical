/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {parse} from '@babel/parser';
import MagicString from 'magic-string';
import * as fs from 'node:fs';
import {createRequire} from 'node:module';
import * as path from 'node:path';

/** @typedef {{source: string, imported: string}} ImportTarget */
/** @typedef {import('../SubpathImports').SubpathImportsOptions} Options */
/** @typedef {import('../SubpathImports').SubpathImportsPlugin} Plugin */

/** @param {string} filename */
const withoutExtension = filename => filename.replace(/\.[cm]?[jt]sx?$/, '');

/** @param {string} code @param {string} filename */
function parseModule(code, filename) {
  return parse(code, {
    createImportExpressions: true,
    plugins: /** @type {import('@babel/parser').ParserPlugin[]} */ ([
      ...(/\.[cm]?tsx?$/.test(filename) ? ['typescript'] : []),
      ...(/\.[jt]sx$/.test(filename) ? ['jsx'] : []),
    ]),
    sourceType: 'module',
  });
}

/**
 * Locate the package without requiring a package.json export or evaluating
 * its entry point. Absolute package.json paths also support unbuilt checkouts.
 * @param {string} name
 * @param {string} root
 */
function packageFile(name, root) {
  if (path.isAbsolute(name) || name.startsWith('.')) {
    return path.resolve(root, name);
  }
  const require = createRequire(path.resolve(root, 'package.json'));
  let dir = path.dirname(require.resolve(name));
  while (true) {
    const file = path.join(dir, 'package.json');
    if (
      fs.existsSync(file) &&
      JSON.parse(fs.readFileSync(file, 'utf8')).name === name
    ) {
      return file;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Cannot find package.json for ${name}`);
    }
    dir = parent;
  }
}

/** @param {Options} options */
function readImports(options) {
  /** @type {Map<string, string>} */
  const modules = new Map();
  /** @type {Map<string, string>} */
  const sources = new Map();
  /** @type {Map<string, Map<string, ImportTarget>>} */
  const barrels = new Map();
  /** @type {Map<string, Set<string>>} */
  const stars = new Map();
  const files = new Set();
  const roots = [];
  for (const name of options.packages || ['@lexical/extension']) {
    const file = packageFile(name, options.root || process.cwd());
    files.add(file);
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Bypassing a barrel also bypasses its unused re-exported modules. Only
    // do that when the package explicitly promises they have no side effects.
    if (pkg.sideEffects !== false) {
      continue;
    }
    const entries = Object.entries(pkg.exports || {}).filter(
      ([key, value]) =>
        key.startsWith('.') &&
        typeof value === 'object' &&
        value !== null &&
        'source' in value,
    );
    // Single-entry packages have no public subpaths to target.
    if (entries.filter(([key]) => !key.endsWith('.js')).length < 2) {
      continue;
    }
    roots.push(pkg.name);
    for (const [key, entry] of entries) {
      const source = path.resolve(
        path.dirname(file),
        /** @type {{source: string}} */ (entry).source,
      );
      const moduleName = `${pkg.name}${key.slice(1)}`;
      sources.set(moduleName, source);
      if (!key.endsWith('.js')) {
        modules.set(withoutExtension(source), moduleName);
      }
    }
  }
  /** @param {string} source @param {string} filename */
  const resolve = (source, filename) => {
    if (source.startsWith('.')) {
      const resolved = withoutExtension(
        path.resolve(path.dirname(filename), source),
      );
      return (
        modules.get(resolved) ||
        modules.get(path.join(resolved, 'index')) ||
        source
      );
    }
    return source;
  };
  /** @param {string} name */
  const read = name => {
    const filename = sources.get(name);
    if (!filename) {
      throw new Error(
        `No public source entry for ${name}; use explicit named re-exports`,
      );
    }
    files.add(filename);
    return {
      body: parseModule(fs.readFileSync(filename, 'utf8'), filename).program
        .body,
      filename,
    };
  };
  /**
   * Collect names for export * without following bindings into private
   * implementation files. Reject unsupported/ambiguous stars explicitly.
   * @param {string} name
   */
  const starNames = name => {
    const {body} = read(name);
    const names = new Set();
    const values = new Set();
    for (const node of body) {
      if (node.type === 'ExportAllDeclaration') {
        throw new Error(`${name}: use explicit re-exports for nested stars`);
      }
      if (node.type !== 'ExportNamedDeclaration') {
        continue;
      }
      for (const spec of node.specifiers) {
        const exported =
          spec.exported.type === 'Identifier'
            ? spec.exported.name
            : spec.exported.value;
        names.add(exported);
        if (
          node.exportKind !== 'type' &&
          (spec.type !== 'ExportSpecifier' || spec.exportKind !== 'type')
        ) {
          values.add(exported);
        }
      }
      const decl = node.declaration;
      if (decl && decl.type === 'VariableDeclaration') {
        for (const item of decl.declarations) {
          if (item.id.type !== 'Identifier') {
            throw new Error(
              `${name}: use explicit re-exports for destructuring`,
            );
          }
          names.add(item.id.name);
          values.add(item.id.name);
        }
      } else if (
        decl &&
        'id' in decl &&
        decl.id &&
        decl.id.type === 'Identifier'
      ) {
        names.add(decl.id.name);
        if (
          decl.type === 'ClassDeclaration' ||
          decl.type === 'FunctionDeclaration'
        ) {
          values.add(decl.id.name);
        }
      }
    }
    names.delete('default');
    values.delete('default');
    stars.set(name, values);
    return names;
  };
  for (const name of roots) {
    if (!sources.has(name)) {
      continue;
    }
    const {filename, body} = read(name);
    // Do not bypass root entry points with executable initialization (e.g.
    // @lexical/headless). Only transparent re-export barrels are eligible.
    if (
      !body.length ||
      !body.every(
        node =>
          (node.type === 'ExportNamedDeclaration' ||
            node.type === 'ExportAllDeclaration') &&
          node.source,
      )
    ) {
      continue;
    }
    /** @type {Map<string, ImportTarget>} */
    const exports = new Map();
    for (const node of body) {
      if (
        node.type !== 'ExportNamedDeclaration' &&
        node.type !== 'ExportAllDeclaration'
      ) {
        continue;
      }
      if (!node.source || (node.attributes && node.attributes.length)) {
        throw new Error(
          `${name}: expected only re-exports without import attributes`,
        );
      }
      const target = resolve(node.source.value, filename);
      if (target.startsWith('.')) {
        throw new Error(`${name}: ${target} is not a public subpath`);
      }
      if (node.type === 'ExportAllDeclaration') {
        for (const imported of starNames(target)) {
          if (exports.has(imported)) {
            throw new Error(
              `${name}: use explicit re-exports for duplicate ${imported}`,
            );
          }
          exports.set(imported, {imported, source: target});
        }
      } else {
        for (const spec of node.specifiers) {
          if (spec.type !== 'ExportSpecifier') {
            throw new Error(
              `${name}: use named re-exports instead of namespaces`,
            );
          }
          exports.set(
            spec.exported.type === 'Identifier'
              ? spec.exported.name
              : spec.exported.value,
            {
              imported: spec.local.name,
              source: target,
            },
          );
        }
      }
    }
    barrels.set(name, exports);
  }
  return {barrels, files, resolve, stars};
}

/**
 * Replace imports of transparent package barrels with their public subpaths.
 * The mapping comes from the installed package's source exports, so it stays
 * aligned with that version, including aliases and compatibility re-exports.
 * @param {Options} [options]
 * @returns {Plugin}
 */
export function subpathImports(options = {}) {
  /** @type {ReturnType<typeof readImports> | undefined} */
  let imports;
  return {
    buildStart() {
      imports = readImports(options);
      for (const file of imports.files) {
        this.addWatchFile(file);
      }
    },
    enforce: 'pre',
    name: '@lexical/compiler/subpath-imports',
    transform(code, id) {
      const filename = id.replace(/[?#].*$/, '');
      if (!/\.[cm]?[jt]sx?$/.test(filename) || filename.endsWith('.d.ts')) {
        return null;
      }
      imports ||= readImports(options);
      const {barrels, resolve, stars} = imports;
      const ast = parseModule(code, filename);
      const output = new MagicString(code);
      let changed = false;
      /** @param {string} source @param {string} imported */
      const targetFor = (source, imported) => {
        const seen = new Set();
        while (barrels.has(source)) {
          const key = `${source}:${imported}`;
          if (seen.has(key)) {
            throw new Error(`Circular barrel re-export: ${key}`);
          }
          seen.add(key);
          const target = /** @type {Map<string, ImportTarget>} */ (
            barrels.get(source)
          ).get(imported);
          if (!target) {
            throw new Error(`${filename}: unknown barrel export ${key}`);
          }
          ({source, imported} = target);
        }
        return {imported, source};
      };
      /** @param {string} source */
      const unsupported = source => {
        if (options.strict) {
          throw new Error(
            `${filename}: use named subpath imports instead of the ${source} barrel`,
          );
        }
      };
      /** @param {any} node @param {string} replacement */
      const replace = (node, replacement) => {
        output.overwrite(node.start, node.end, replacement);
        changed = true;
      };
      /** @param {any} node */
      const walk = node => {
        if (!node || typeof node !== 'object') {
          return;
        }
        if (
          node.type === 'ImportDeclaration' ||
          node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportAllDeclaration'
        ) {
          if (
            !node.source ||
            node.importKind === 'type' ||
            node.exportKind === 'type'
          ) {
            return;
          }
          const source = resolve(node.source.value, filename);
          if (!barrels.has(source)) {
            // Explicit exports avoid runtime namespace enumeration in
            // consumers and let Rollup enumerate the barrel's own exports.
            const names = stars.get(source);
            if (
              node.type === 'ExportAllDeclaration' &&
              names &&
              !(node.attributes && node.attributes.length)
            ) {
              replace(
                node,
                `export {${[...names].join(', ')}} from ${JSON.stringify(source)};`,
              );
              return;
            }
            if (source !== node.source.value) {
              replace(node.source, JSON.stringify(source));
            }
            return;
          }
          if (
            (node.attributes && node.attributes.length) ||
            node.type === 'ExportAllDeclaration' ||
            !node.specifiers.length ||
            node.specifiers.some(
              /** @param {any} spec */ spec => spec.type.includes('Namespace'),
            )
          ) {
            unsupported(source);
            return;
          }
          const isImport = node.type === 'ImportDeclaration';
          const statements = node.specifiers.map(
            /** @param {any} spec */ spec => {
              if (spec.importKind === 'type' || spec.exportKind === 'type') {
                return `${isImport ? 'import' : 'export'} {${code.slice(spec.start, spec.end)}} from ${JSON.stringify(node.source.value)};`;
              }
              const name =
                spec.type === 'ImportDefaultSpecifier'
                  ? 'default'
                  : ((isImport ? spec.imported : spec.local).name ??
                    (isImport ? spec.imported : spec.local).value);
              const target = targetFor(source, name);
              const local = isImport ? spec.local : spec.exported;
              const localName =
                local.type === 'Identifier'
                  ? local.name
                  : JSON.stringify(local.value);
              const imported = /^[A-Za-z_$][\w$]*$/.test(target.imported)
                ? target.imported
                : JSON.stringify(target.imported);
              return `${isImport ? 'import' : 'export'} {${imported}${imported === localName ? '' : ` as ${localName}`}} from ${JSON.stringify(target.source)};`;
            },
          );
          replace(node, statements.join('\n'));
          return;
        }
        if (
          node.type === 'ImportExpression' ||
          (node.type === 'CallExpression' &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'require')
        ) {
          const arg =
            node.type === 'ImportExpression' ? node.source : node.arguments[0];
          if (arg && arg.type === 'StringLiteral') {
            const source = resolve(arg.value, filename);
            if (barrels.has(source)) {
              unsupported(source);
            } else if (source !== arg.value) {
              replace(arg, JSON.stringify(source));
            }
          }
        }
        for (const [key, value] of Object.entries(node)) {
          if (key === 'loc' || key.endsWith('Comments') || key === 'comments') {
            continue;
          }
          if (Array.isArray(value)) {
            value.forEach(walk);
          } else if (value && typeof value === 'object') {
            walk(value);
          }
        }
      };
      ast.program.body.forEach(walk);
      return changed
        ? {
            code: output.toString(),
            map: output.generateMap({
              hires: true,
              includeContent: true,
              source: filename,
            }),
          }
        : null;
    },
  };
}
