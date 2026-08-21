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

/**
 * The factories whose implementation is a trivial expression over their own
 * arguments, and the shape a call to them can be replaced with. Eliding the
 * call is better than annotating it: a literal is inert for every bundler,
 * with no annotation to preserve and nothing left to pin the definition it
 * appears in.
 *
 * Each of these is marked `@lexicalInline <form>` where it is defined, and
 * the unit tests check both that the marker and this table agree and that
 * the real function still returns what the form claims. `createCommand` is
 * deliberately not here: `{type: x}` is more bytes than a call to a minified
 * one-character name.
 *
 * - `identity` returns its single argument
 * - `args` returns all of its arguments as an array
 * - `tuple` returns its `arity` arguments as an array
 *
 * @type {ReadonlyMap<string, {arity?: number, form: 'args' | 'identity' | 'tuple'}>}
 */
const INLINE_FACTORIES = new Map([
  ['configExtension', {form: 'args'}],
  ['declarePeerDependency', {arity: 2, form: 'tuple'}],
  ['defineExtension', {form: 'identity'}],
  ['defineImportRule', {form: 'identity'}],
  ['safeCast', {form: 'identity'}],
]);

/** The marker a definition uses to declare itself inlinable. */
const INLINE_MARKER_RE = /@lexicalInline\s+(\w+)/;

/**
 * The form each inlinable factory is replaced with, for the tests that keep
 * this table honest and for anyone who wants to know what `inline` does.
 *
 * @type {ReadonlyMap<string, string>}
 */
export const INLINE_FACTORY_FORMS = new Map(
  Array.from(INLINE_FACTORIES, ([name, spec]) => [name, spec.form]),
);

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
 * `visitor` with each module-scope call to one of `functions`. The second
 * argument is true when the call's value is thrown away (it is the whole of
 * an expression statement), which is the one place a call must not be
 * replaced by a literal.
 *
 * @param {any} node
 * @param {ReadonlyMap<string, string> | ReadonlySet<string>} functions
 * @param {(node: any, discarded: boolean) => void} visitor
 * @param {boolean} [discarded]
 */
function visitModuleScopeCalls(node, functions, visitor, discarded) {
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
    visitor(node, discarded === true);
  }
  for (const key of Object.keys(node)) {
    if (!SKIPPED_KEYS.has(key)) {
      const value = node[key];
      if (value && typeof value === 'object') {
        visitModuleScopeCalls(
          value,
          functions,
          visitor,
          node.type === 'ExpressionStatement' && key === 'expression',
        );
      }
    }
  }
}

/**
 * True when a call to a factory of this form can be replaced by the literal
 * it would have returned. Anything the form cannot account for — a spread
 * argument, the wrong number of arguments, a comma expression that would
 * lose its parentheses — is annotated instead.
 *
 * @param {any} node the call expression
 * @param {{arity?: number, form: string}} spec
 * @returns {boolean}
 */
function canInlineCall(node, spec) {
  const args = node.arguments;
  if (spec.form === 'identity') {
    return (
      args.length === 1 &&
      args[0].type !== 'SpreadElement' &&
      args[0].type !== 'SequenceExpression'
    );
  }
  if (spec.form === 'tuple') {
    return (
      args.length === spec.arity &&
      args.every(
        /** @param {any} argument */ argument =>
          argument.type !== 'SpreadElement',
      )
    );
  }
  return true;
}

/**
 * Walk every node in the tree, calling `visit` with each node and the node
 * and key that hold it. Unlike visitModuleScopeCalls this does not stop at
 * function boundaries: it is used to prove that a name is *not* referenced
 * anywhere else in the module.
 *
 * @param {any} node
 * @param {(node: any, parent: any, key: string) => void} visit
 * @param {any} [parent]
 * @param {string} [key]
 */
function walkAllNodes(node, visit, parent, key) {
  if (Array.isArray(node)) {
    for (const child of node) {
      walkAllNodes(child, visit, parent, key);
    }
    return;
  }
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') {
    return;
  }
  visit(node, parent, /** @type {string} */ (key));
  for (const childKey of Object.keys(node)) {
    if (!SKIPPED_KEYS.has(childKey)) {
      const value = node[childKey];
      if (value && typeof value === 'object') {
        walkAllNodes(value, visit, node, childKey);
      }
    }
  }
}

/**
 * True when an identifier node is a reference to a binding rather than a
 * name in some other position (a property name, an import specifier, ...).
 * Anything unrecognized counts as a reference, so an unexpected position
 * keeps the import rather than removing one that is still needed.
 *
 * @param {any} node
 * @param {any} parent
 * @param {string} key
 * @returns {boolean}
 */
function isValueReference(node, parent, key) {
  if (node.type !== 'Identifier' && node.type !== 'JSXIdentifier') {
    return false;
  }
  if (!parent) {
    return true;
  }
  switch (parent.type) {
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'ImportSpecifier':
      return false;
    case 'ExportSpecifier':
      // `export {imported as somethingElse}` still refers to the binding.
      return key === 'local';
    case 'OptionalMemberExpression':
    case 'MemberExpression':
      return key !== 'property' || parent.computed === true;
    case 'ClassMethod':
    case 'ClassProperty':
    case 'ObjectMethod':
    case 'ObjectProperty':
      return key !== 'key' || parent.computed === true;
    default:
      return true;
  }
}

/**
 * Remove the import specifiers whose only uses were calls that have just
 * been replaced by a literal, so the transform does not leave behind an
 * import that nothing references (which bundlers then warn about).
 *
 * @param {MagicString} magicString
 * @param {any} program
 * @param {ReadonlyArray<any>} inlinedCalls the call nodes that were replaced
 */
function removeUnusedImports(magicString, program, inlinedCalls) {
  const callees = new Set(inlinedCalls.map(node => node.callee));
  const names = new Set(inlinedCalls.map(node => node.callee.name));
  if (names.size === 0) {
    return;
  }
  // A name is still needed if anything other than an inlined callee refers
  // to it, anywhere in the module.
  walkAllNodes(program, (node, parent, key) => {
    if (
      names.has(node.name) &&
      !callees.has(node) &&
      isValueReference(node, parent, key)
    ) {
      names.delete(node.name);
    }
  });
  for (const statement of program.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type'
    ) {
      continue;
    }
    const {specifiers} = statement;
    const removable = specifiers.filter(
      /** @param {any} specifier */ specifier =>
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind !== 'type' &&
        names.has(specifier.local.name),
    );
    if (removable.length === 0) {
      continue;
    }
    if (removable.length === specifiers.length) {
      magicString.remove(statement.start, statement.end);
      continue;
    }
    for (const specifier of removable) {
      const index = specifiers.indexOf(specifier);
      if (index < specifiers.length - 1) {
        magicString.remove(specifier.start, specifiers[index + 1].start);
      } else {
        magicString.remove(specifiers[index - 1].end, specifier.end);
      }
    }
  }
}

/**
 * Replace a call with the literal the factory would have returned, keeping
 * the argument source text (and any nested edits within it) intact.
 *
 * @param {MagicString} magicString
 * @param {string} code
 * @param {any} node the call expression
 * @param {{arity?: number, form: string}} spec
 */
function inlineCall(magicString, code, node, spec) {
  const comment = blockCommentBefore(code, node.start);
  if (comment !== null && PURE_ANNOTATION_RE.test(comment.value)) {
    // Left in front of a literal the annotation does nothing, and bundlers
    // report it as misplaced.
    magicString.remove(comment.start, node.start);
  }
  const args = node.arguments;
  if (spec.form === 'identity') {
    magicString.remove(node.start, args[0].start);
    magicString.remove(args[0].end, node.end);
  } else if (args.length === 0) {
    magicString.overwrite(node.start, node.end, '[]');
  } else {
    magicString.overwrite(node.start, args[0].start, '[');
    magicString.overwrite(args[args.length - 1].end, node.end, ']');
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
 * @returns {Map<string, string>} local name to the factory it refers to
 */
function collectFactoryNames(program, functions, opts) {
  const sources = toRegExpArray(opts.sources, DEFAULT_SOURCES);
  /** @type {Map<string, string>} */
  const names = new Map();
  for (const name of pureDeclaredNames(program)) {
    if (functions.has(name)) {
      names.set(name, name);
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
        names.set(specifier.local.name, specifier.imported.name);
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
        names.set(specifier.local.name, specifier.imported.name);
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
 * @property {boolean} [inline] Replace calls to the factories whose result
 *   is a trivial expression over their arguments with that expression,
 *   rather than annotating them. Off by default: it assumes the Lexical
 *   being built matches this package's version.
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
 * @property {number} inlined Number of calls that were replaced by the
 *   literal they would have returned.
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
  /** @type {Array<[any, {arity?: number, form: string}]>} */
  const inlined = [];
  visitModuleScopeCalls(ast.program, factoryNames, (node, discarded) => {
    const spec =
      opts.inline === true
        ? INLINE_FACTORIES.get(
            /** @type {string} */ (factoryNames.get(node.callee.name)),
          )
        : undefined;
    if (spec !== undefined && !discarded && canInlineCall(node, spec)) {
      inlined.push([node, spec]);
    } else if (!hasPureAnnotation(code, node.start)) {
      offsets.push(node.start);
    }
  });
  if (offsets.length === 0 && inlined.length === 0) {
    return null;
  }
  const magicString = new MagicString(code);
  for (const offset of offsets) {
    magicString.appendLeft(offset, ANNOTATION);
  }
  for (const [node, spec] of inlined) {
    inlineCall(magicString, code, node, spec);
  }
  removeUnusedImports(
    magicString,
    ast.program,
    inlined.map(([node]) => node),
  );
  return {
    code: magicString.toString(),
    count: offsets.length,
    inlined: inlined.length,
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
 * @property {boolean} [inline] Replace calls to the factories whose result
 *   is a trivial expression over their arguments with that expression,
 *   rather than annotating them. Off by default: it assumes the Lexical
 *   being built matches this package's version.
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
          inline: opts.inline,
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
