/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * For bootstrapping reasons this module is written in plain JavaScript: the
 * monorepo's own Rollup build imports it directly from source to annotate
 * the packages it is building, which happens before anything has been
 * compiled. `src/index.ts` is the typed facade that the published package
 * is built from.
 *
 * The comments here spell the annotations without their leading sigil
 * (`__PURE__`, `__NO_SIDE_EFFECTS__`) because bundlers scan comments for
 * annotations, and one that does not precede a call expression is reported
 * as misplaced (rollup's INVALID_ANNOTATION). Only the string and regexp
 * literals below contain the real tokens.
 */

import {parse} from '@babel/parser';
import MagicString from 'magic-string';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * The Lexical factories that are annotated with `__NO_SIDE_EFFECTS__` at
 * their definition. That annotation is only honored by esbuild for calls in
 * the same file as the definition (and not at all by webpack/terser), so
 * every module-scope call site needs its own `__PURE__` annotation for
 * bundlers to tree-shake unused extension/command/rule definitions out of
 * application bundles.
 *
 * Argument-position calls (e.g. `configExtension` / `safeCast` inside a
 * `defineExtension` config) matter too: a pure call is only removable when
 * its arguments are also side-effect-free, so one unannotated nested call
 * pins the entire enclosing definition.
 *
 * @type {ReadonlyArray<string>}
 */
export const PURE_FACTORY_FUNCTIONS = [
  'configExtension',
  'createCommand',
  'createContextState',
  'createImportState',
  'createRenderState',
  'createState',
  'declarePeerDependency',
  'defineExtension',
  'defineImportRule',
  'defineOverlayRules',
  'domOverride',
  'safeCast',
];

/** The annotation inserted before a module-scope factory call. */
const ANNOTATION = '/* @__PURE__ */ ';

/** Matches the contents of a comment that is already a pure annotation. */
const PURE_ANNOTATION_RE = /[#@]__PURE__/;

/** The file extensions the bundler plugin transforms by default. */
const DEFAULT_INCLUDE = /\.(?:[cm]?[jt]sx?)$/;

/**
 * Module specifiers whose exports are trusted to be the Lexical factories.
 * Every factory in PURE_FACTORY_FUNCTIONS is declared side-effect free in
 * these packages, so an import from one of them is evidence enough. A call
 * to a same-named function from anywhere else is only annotated when the
 * declaration it resolves to is itself marked side-effect free.
 */
const DEFAULT_SOURCES = [/^lexical$/, /^@lexical\//];

/** Matches the annotation a definition uses to declare itself pure. */
const NO_SIDE_EFFECTS_RE = /[#@]__NO_SIDE_EFFECTS__/;

/** Extensions tried when resolving an extensionless relative import. */
const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];

/**
 * Node types whose contents are not evaluated when the module is
 * initialized. A `__PURE__` annotation only affects tree-shaking of
 * module-scope evaluation, so the walk never descends into these.
 */
const DEFERRED_TYPES = new Set([
  'ArrowFunctionExpression',
  'ClassAccessorProperty',
  'ClassMethod',
  'ClassPrivateMethod',
  'ClassPrivateProperty',
  'ClassProperty',
  'FunctionDeclaration',
  'FunctionExpression',
  'ObjectMethod',
  'PropertyDefinition',
  'StaticBlock',
  'TSDeclareMethod',
]);

/** AST properties that never contain child nodes worth visiting. */
const SKIPPED_KEYS = new Set([
  'comments',
  'extra',
  'innerComments',
  'leadingComments',
  'loc',
  'trailingComments',
]);

/**
 * @param {undefined | string} filename
 * @param {undefined | ReadonlyArray<any>} extraPlugins
 * @returns {Array<any>} the Babel parser plugins to parse this file with
 */
function parserPluginsFor(filename, extraPlugins) {
  const name = typeof filename === 'string' ? filename : '';
  const isTypeScript = /\.[cm]?tsx?$/i.test(name);
  /** @type {Array<any>} */
  const plugins = ['explicitResourceManagement'];
  if (isTypeScript) {
    plugins.push('typescript');
  }
  // `<T>(value: T) => value` in a .ts file is a generic arrow function, not
  // an opening JSX element, so the jsx plugin must stay off there. Any other
  // extension (including an unknown one) is parsed with jsx enabled.
  if (!isTypeScript || /\.[cm]?tsx$/i.test(name)) {
    plugins.push('jsx');
  }
  return extraPlugins ? plugins.concat(extraPlugins) : plugins;
}

/**
 * Find the block comment that ends immediately before `offset` (ignoring
 * whitespace), if any.
 *
 * This reads the source text rather than the parsed `leadingComments` so
 * that a comment attached to an enclosing statement (one that precedes
 * `export const x = f()` rather than the call itself, where it does nothing)
 * is not mistaken for an annotation on the call.
 *
 * @param {string} code
 * @param {number} offset
 * @returns {null | {end: number, start: number, value: string}}
 */
function blockCommentBefore(code, offset) {
  let end = offset;
  while (end > 0 && /\s/.test(code[end - 1])) {
    end--;
  }
  if (end < 4 || code[end - 1] !== '/' || code[end - 2] !== '*') {
    return null;
  }
  const start = code.lastIndexOf('/*', end - 2);
  if (start === -1) {
    return null;
  }
  return {end, start, value: code.slice(start + 2, end - 2)};
}

/**
 * @param {string} code
 * @param {number} offset the start of a call expression
 * @returns {boolean} true when the call already carries a pure annotation
 */
function hasPureAnnotation(code, offset) {
  const comment = blockCommentBefore(code, offset);
  return comment !== null && PURE_ANNOTATION_RE.test(comment.value);
}

/**
 * Walk every node that is evaluated when the module is initialized, calling
 * `visitor` with each module-scope call to one of `functions`.
 *
 * @param {any} node
 * @param {ReadonlySet<string>} functions
 * @param {(node: any) => void} visitor
 */
function visitModuleScopeCalls(node, functions, visitor) {
  if (Array.isArray(node)) {
    for (const child of node) {
      visitModuleScopeCalls(child, functions, visitor);
    }
    return;
  }
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') {
    return;
  }
  if (DEFERRED_TYPES.has(node.type)) {
    return;
  }
  if (
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    functions.has(node.callee.name)
  ) {
    visitor(node);
  }
  for (const key of Object.keys(node)) {
    if (!SKIPPED_KEYS.has(key)) {
      const value = node[key];
      if (value && typeof value === 'object') {
        visitModuleScopeCalls(value, functions, visitor);
      }
    }
  }
}

/**
 * Caches for the files read while resolving relative imports. They live for
 * the lifetime of the process, which is what a build wants; a watch-mode
 * process that changes whether a declaration is marked side-effect free has
 * to be restarted for that to take effect (the annotations do not change
 * behavior, only what a bundler is allowed to drop).
 */
const resolvedFileCache = new Map();
const pureDeclarationCache = new Map();

/**
 * @param {undefined | ReadonlyArray<any>} comments
 * @returns {boolean} true when one of the comments is a NO_SIDE_EFFECTS annotation
 */
function hasNoSideEffectsComment(comments) {
  return (
    comments !== undefined &&
    comments !== null &&
    comments.some(comment => NO_SIDE_EFFECTS_RE.test(comment.value))
  );
}

/**
 * The names this module declares (at module scope) with a NO_SIDE_EFFECTS
 * annotation. Calls to these are safe to annotate wherever they appear,
 * because the definition itself says so.
 *
 * @param {any} program
 * @returns {Set<string>} the declared names
 */
function pureDeclaredNames(program) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' && statement.declaration
        ? statement.declaration
        : statement;
    const declared = hasNoSideEffectsComment(
      (statement.leadingComments || []).concat(
        declaration === statement ? [] : declaration.leadingComments || [],
      ),
    );
    if (declaration.type === 'FunctionDeclaration' && declaration.id) {
      if (declared) {
        names.add(declaration.id.name);
      }
    } else if (declaration.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (
          declarator.id.type === 'Identifier' &&
          (declared ||
            hasNoSideEffectsComment(declarator.leadingComments) ||
            (declarator.init &&
              hasNoSideEffectsComment(declarator.init.leadingComments)))
        ) {
          names.add(declarator.id.name);
        }
      }
    }
  }
  return names;
}

/**
 * Resolve a relative import specifier to a file on disk, trying the
 * extensions a bundler would (including the `.js` specifier TypeScript uses
 * for a `.ts` file).
 *
 * @param {string} filename the importing module
 * @param {string} specifier a relative specifier
 * @returns {null | string} the resolved path, or null when there is no such file
 */
function resolveRelativeSpecifier(filename, specifier) {
  const base = path.resolve(path.dirname(filename), specifier);
  const cached = resolvedFileCache.get(base);
  if (cached !== undefined) {
    return cached;
  }
  /** @type {Array<string>} */
  const candidates = [];
  const extension = path.extname(base);
  if (extension !== '') {
    candidates.push(base);
    if (/^\.[cm]?js$/.test(extension)) {
      const withoutExtension = base.slice(0, -extension.length);
      candidates.push(
        withoutExtension + extension.replace('js', 'ts'),
        withoutExtension + '.tsx',
      );
    }
  }
  for (const candidate of RESOLVE_EXTENSIONS) {
    candidates.push(base + candidate);
  }
  for (const candidate of RESOLVE_EXTENSIONS) {
    candidates.push(path.join(base, `index${candidate}`));
  }
  let resolved = null;
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) {
        resolved = candidate;
        break;
      }
    } catch (_err) {
      // Not this candidate; try the next one.
    }
  }
  resolvedFileCache.set(base, resolved);
  return resolved;
}

/**
 * The side-effect-free declarations of another file, parsed and cached.
 *
 * @param {string} filename
 * @param {undefined | ReadonlyArray<any>} parserPlugins
 * @returns {ReadonlySet<string>}
 */
function pureDeclaredNamesOfFile(filename, parserPlugins) {
  const cached = pureDeclarationCache.get(filename);
  if (cached !== undefined) {
    return cached;
  }
  /** @type {Set<string>} */
  let names = new Set();
  try {
    const ast = parse(fs.readFileSync(filename, 'utf8'), {
      plugins: parserPluginsFor(filename, parserPlugins),
      sourceType: 'module',
    });
    names = pureDeclaredNames(ast.program);
  } catch (_err) {
    // A file this cannot read or parse simply provides no evidence.
  }
  pureDeclarationCache.set(filename, names);
  return names;
}

/**
 * The local names in this module that refer to a side-effect-free factory,
 * and may therefore have their module-scope calls annotated.
 *
 * A name qualifies when it is imported from a trusted Lexical package, when
 * it is declared in this module with a NO_SIDE_EFFECTS annotation, or when
 * it is imported from a relative module that declares it that way. A local
 * helper that merely shares a name with one of the factories does not
 * qualify, which is what keeps the transform from claiming that somebody
 * else's `safeCast` or `createState` has no side effects.
 *
 * @param {any} program
 * @param {ReadonlySet<string>} functions
 * @param {TransformPureAnnotationsOptions} opts
 * @returns {Set<string>}
 */
function collectFactoryNames(program, functions, opts) {
  const sources = toRegExpArray(opts.sources, DEFAULT_SOURCES);
  const names = new Set();
  for (const name of pureDeclaredNames(program)) {
    if (functions.has(name)) {
      names.add(name);
    }
  }
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') {
      continue;
    }
    const source = statement.source.value;
    const trusted = matchesAny(sources, source);
    const relative =
      !trusted &&
      opts.relativeImports !== false &&
      typeof opts.filename === 'string' &&
      source.startsWith('.');
    if (!trusted && !relative) {
      continue;
    }
    for (const specifier of statement.specifiers) {
      if (
        specifier.type !== 'ImportSpecifier' ||
        specifier.imported.type !== 'Identifier' ||
        !functions.has(specifier.imported.name)
      ) {
        continue;
      }
      if (trusted) {
        names.add(specifier.local.name);
        continue;
      }
      const resolved = resolveRelativeSpecifier(
        /** @type {string} */ (opts.filename),
        source,
      );
      if (
        resolved !== null &&
        pureDeclaredNamesOfFile(resolved, opts.parserPlugins).has(
          specifier.imported.name,
        )
      ) {
        names.add(specifier.local.name);
      }
    }
  }
  return names;
}

/**
 * @param {string} code
 * @param {ReadonlySet<string>} functions
 * @returns {boolean} true when the source mentions any of the factories at all
 */
function mayNeedAnnotations(code, functions) {
  for (const name of functions) {
    if (code.includes(name)) {
      return true;
    }
  }
  return false;
}

/**
 * @typedef {Object} TransformPureAnnotationsOptions
 * @property {string} [filename] Path of the module being transformed, used
 *   to choose the TypeScript and JSX parser plugins.
 * @property {Iterable<string>} [functions] Names of the factories whose
 *   module-scope calls are annotated. Defaults to PURE_FACTORY_FUNCTIONS.
 * @property {ReadonlyArray<any>} [parserPlugins] Extra Babel parser
 *   plugins, for syntax the defaults do not cover.
 * @property {boolean} [relativeImports] Set to false to skip reading
 *   relatively imported modules to look for a NO_SIDE_EFFECTS declaration.
 * @property {boolean} [sourceMap] Set to false to skip source map generation.
 * @property {RegExp | ReadonlyArray<RegExp>} [sources] Module specifiers
 *   whose exports are trusted to be the factories, defaults to `lexical` and
 *   `@lexical/*`.
 */

/**
 * @typedef {Object} PureAnnotationsResult
 * @property {number} count Number of annotations that were inserted.
 * @property {string} code
 * @property {any} [map]
 */

/**
 * Insert a `__PURE__` annotation before every module-scope call to one of the
 * side-effect-free Lexical factories that does not already have one.
 *
 * Returns `null` when the module needs no annotations, so a caller can pass
 * the original source through untouched.
 *
 * @param {string} code
 * @param {TransformPureAnnotationsOptions} [options]
 * @returns {null | PureAnnotationsResult}
 */
export function transformPureAnnotations(code, options) {
  const opts = options || {};
  const functions = new Set(opts.functions || PURE_FACTORY_FUNCTIONS);
  if (functions.size === 0 || !mayNeedAnnotations(code, functions)) {
    return null;
  }
  const ast = parse(code, {
    errorRecovery: false,
    plugins: parserPluginsFor(opts.filename, opts.parserPlugins),
    sourceFilename: opts.filename,
    sourceType: 'module',
  });
  // Only the calls whose callee resolves to a factory this module imported
  // from Lexical (or to a declaration that says it is side-effect free) are
  // annotated; a same-named local helper is left alone.
  const factoryNames = collectFactoryNames(ast.program, functions, opts);
  if (factoryNames.size === 0) {
    return null;
  }
  /** @type {Array<number>} */
  const offsets = [];
  visitModuleScopeCalls(ast.program, factoryNames, node => {
    if (!hasPureAnnotation(code, node.start)) {
      offsets.push(node.start);
    }
  });
  if (offsets.length === 0) {
    return null;
  }
  const magicString = new MagicString(code);
  for (const offset of offsets) {
    magicString.appendLeft(offset, ANNOTATION);
  }
  return {
    code: magicString.toString(),
    count: offsets.length,
    map:
      opts.sourceMap === false
        ? undefined
        : magicString.generateMap({hires: 'boundary', source: opts.filename}),
  };
}

/**
 * @param {undefined | RegExp | ReadonlyArray<RegExp>} value
 * @param {ReadonlyArray<RegExp>} defaultValue
 * @returns {ReadonlyArray<RegExp>}
 */
function toRegExpArray(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }
  return Array.isArray(value) ? value : [/** @type {RegExp} */ (value)];
}

/**
 * @param {ReadonlyArray<RegExp>} patterns
 * @param {string} id
 * @returns {boolean}
 */
function matchesAny(patterns, id) {
  return patterns.some(pattern => pattern.test(id));
}

/**
 * Strip the query string and hash a bundler may append to a module id
 * (e.g. `Foo.tsx?vue&type=script`).
 *
 * @param {string} id
 * @returns {string}
 */
function cleanModuleId(id) {
  return id.replace(/[?#][\s\S]*$/, '');
}

/**
 * @typedef {Object} PureAnnotationsOptions
 * @property {'post' | 'pre'} [enforce] Vite plugin ordering, `'post'` by
 *   default so the transform runs after TypeScript/JSX has been compiled away.
 * @property {RegExp | ReadonlyArray<RegExp>} [exclude] Module ids to skip.
 * @property {Iterable<string>} [functions] Names of the factories whose
 *   module-scope calls are annotated. Defaults to PURE_FACTORY_FUNCTIONS.
 * @property {RegExp | ReadonlyArray<RegExp>} [include] Module ids to
 *   transform, defaults to every .js/.jsx/.ts/.tsx (and .mjs/.cjs/.mts/.cts)
 *   module.
 * @property {ReadonlyArray<any>} [parserPlugins] Extra Babel parser
 *   plugins, for syntax the defaults do not cover.
 * @property {boolean} [relativeImports] Set to false to skip reading
 *   relatively imported modules to look for a NO_SIDE_EFFECTS declaration.
 * @property {boolean} [sourceMap] Set to false to skip source map generation.
 * @property {RegExp | ReadonlyArray<RegExp>} [sources] Module specifiers
 *   whose exports are trusted to be the factories, defaults to `lexical` and
 *   `@lexical/*`.
 */

/**
 * A Vite/Rollup plugin that inserts the `__PURE__` annotations that let
 * bundlers tree-shake unused Lexical extension, command, and rule
 * definitions. Use it when building Lexical (or your own extensions) from
 * TypeScript source rather than from the published `dist` bundles, which
 * already carry the annotations.
 *
 * @param {PureAnnotationsOptions} [options]
 * @returns {any} the plugin object
 */
export function pureAnnotations(options) {
  const opts = options || {};
  const functions = new Set(opts.functions || PURE_FACTORY_FUNCTIONS);
  const include = toRegExpArray(opts.include, [DEFAULT_INCLUDE]);
  const exclude = toRegExpArray(opts.exclude, []);
  return {
    enforce: opts.enforce === undefined ? 'post' : opts.enforce,
    name: '@lexical/pure-annotations',
    /**
     * @param {string} code
     * @param {string} id
     * @returns {null | {code: string, map: any}}
     */
    transform(code, id) {
      const filename = cleanModuleId(id);
      if (!matchesAny(include, filename) || matchesAny(exclude, filename)) {
        return null;
      }
      let result = null;
      try {
        result = transformPureAnnotations(code, {
          filename,
          functions,
          parserPlugins: opts.parserPlugins,
          relativeImports: opts.relativeImports,
          sourceMap: opts.sourceMap,
          sources: opts.sources,
        });
      } catch (err) {
        // A module this plugin cannot parse is a module it has nothing to
        // say about; warn rather than failing the consumer's build.
        if (this && typeof this.warn === 'function') {
          this.warn(
            `@lexical/pure-annotations could not parse ${id}, no annotations were added: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
        return null;
      }
      return result === null
        ? null
        : {
            code: result.code,
            map: result.map === undefined ? null : result.map,
          };
    },
  };
}
