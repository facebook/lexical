/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as impl from './LexicalPureAnnotations.mjs';

// The comments here spell the annotations without their leading sigil
// (`__PURE__`) because bundlers scan comments for annotations, and one that
// does not precede a call expression is reported as misplaced (rollup's
// INVALID_ANNOTATION).

/**
 * The subset of a source map that bundlers consume, matching what
 * `magic-string` produces. Declared structurally so this package needs no
 * dependency on any particular bundler's types.
 */
export interface PureAnnotationsSourceMap {
  file?: string;
  mappings: string;
  names: string[];
  sources: string[];
  sourcesContent?: (string | null)[];
  version: number;
}

export interface TransformPureAnnotationsOptions {
  /**
   * Path of the module being transformed, used to choose the TypeScript and
   * JSX parser plugins (and named as the source map's source).
   */
  filename?: string;
  /**
   * Names of the factories whose module-scope calls are annotated. Defaults
   * to {@link PURE_FACTORY_FUNCTIONS}.
   */
  functions?: Iterable<string>;
  /** Extra `@babel/parser` plugins to parse the module with. */
  parserPlugins?: readonly unknown[];
  /** Set to false to skip source map generation. */
  sourceMap?: boolean;
}

export interface PureAnnotationsResult {
  code: string;
  /** The number of annotations that were inserted. */
  count: number;
  map?: PureAnnotationsSourceMap;
}

export interface PureAnnotationsOptions extends TransformPureAnnotationsOptions {
  /**
   * Vite plugin ordering. Defaults to `'post'` so the transform runs after
   * TypeScript and JSX have been compiled away.
   */
  enforce?: 'post' | 'pre';
  /** Module ids to skip. Defaults to none. */
  exclude?: RegExp | readonly RegExp[];
  /**
   * Module ids to transform. Defaults to every `.js`/`.jsx`/`.ts`/`.tsx`
   * (and `.mjs`/`.cjs`/`.mts`/`.cts`) module, including those in
   * `node_modules` so that a Lexical package consumed through its `source`
   * export condition is annotated.
   */
  include?: RegExp | readonly RegExp[];
}

/**
 * The structural shape of the returned plugin. It is assignable to Vite's
 * `Plugin` and to Rollup's `Plugin`, so it can be dropped into the `plugins`
 * array of either.
 */
export interface PureAnnotationsPlugin {
  enforce?: 'post' | 'pre';
  name: string;
  transform(
    code: string,
    id: string,
  ): {code: string; map: PureAnnotationsSourceMap | null} | null;
}

/**
 * The Lexical factories that are annotated with `__NO_SIDE_EFFECTS__` at
 * their definition and whose module-scope call sites therefore need a
 * `__PURE__` annotation for bundlers to tree-shake unused definitions.
 */
export const PURE_FACTORY_FUNCTIONS: readonly string[] =
  impl.PURE_FACTORY_FUNCTIONS;

/**
 * Insert a `__PURE__` annotation before every module-scope call to one of the
 * side-effect-free Lexical factories that does not already have one. Returns
 * `null` when the module needs no annotations.
 */
export function transformPureAnnotations(
  code: string,
  options?: TransformPureAnnotationsOptions,
): PureAnnotationsResult | null {
  return impl.transformPureAnnotations(code, options);
}

/**
 * A Vite/Rollup plugin that inserts the `__PURE__` annotations that let
 * bundlers tree-shake unused Lexical extension, command, and rule
 * definitions.
 *
 * The published `dist` bundles already carry the annotations, so this is for
 * builds that compile Lexical from its TypeScript source (the `source`
 * export condition, a git checkout, or a vendored copy) — and for annotating
 * the extensions and commands your own application defines.
 *
 * ```js
 * import {pureAnnotations} from '@lexical/pure-annotations';
 *
 * export default defineConfig({plugins: [pureAnnotations()]});
 * ```
 */
export function pureAnnotations(
  options?: PureAnnotationsOptions,
): PureAnnotationsPlugin {
  return impl.pureAnnotations(options);
}
