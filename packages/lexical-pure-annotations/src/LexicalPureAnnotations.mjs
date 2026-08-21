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
 * @property {boolean} [sourceMap] Set to false to skip source map generation.
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
    // Comments are matched against the source text directly, so there is no
    // need to pay for attaching them to the AST.
    attachComment: false,
    errorRecovery: false,
    plugins: parserPluginsFor(opts.filename, opts.parserPlugins),
    sourceFilename: opts.filename,
    sourceType: 'module',
  });
  /** @type {Array<number>} */
  const offsets = [];
  visitModuleScopeCalls(ast.program, functions, node => {
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
 * @property {boolean} [sourceMap] Set to false to skip source map generation.
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
          sourceMap: opts.sourceMap,
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
