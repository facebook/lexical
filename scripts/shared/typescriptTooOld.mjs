/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Lexical publishes its TypeScript declarations exclusively through the
 * package.json "exports" map. A consumer can only read types from "exports"
 * with TypeScript >= 5.0 and `moduleResolution` set to "bundler", "node16",
 * or "nodenext". A consumer using classic `moduleResolution` (or an old
 * TypeScript) ignores "exports" entirely, so every subpath import (e.g.
 * `@lexical/react/ReactExtension`) resolves to nothing and reports a
 * misleading `TS2307: Cannot find module ... or its corresponding type
 * declarations`, which looks like a missing install.
 *
 * To turn that into a clear, actionable error we point the *legacy*
 * type-resolution fields (`types`, `typesVersions`, and a `types@<MIN>`
 * "exports" condition) at the stub declaration file described here. Modern
 * resolvers never see the stub because "exports" takes priority over `types`
 * and `typesVersions` (TypeScript >= 4.9); only the consumers we want to fail
 * resolve it.
 */

/**
 * The minimum TypeScript version that can consume Lexical's published types.
 *
 * Empirically (checking the built `.d.ts` against TypeScript 4.4 - 5.4):
 * - `< 4.7` cannot read types from "exports" at all (no node16/nodenext).
 * - `>= 4.7` works with `moduleResolution` node16/nodenext when the consumer
 *   uses `skipLibCheck`.
 * - `moduleResolution: bundler` requires `>= 5.0`.
 * - `skipLibCheck: false` requires `>= 5.2`, because the public
 *   `LexicalEditorWithDispose` interface extends the global `Disposable`
 *   type, which only exists in the TypeScript 5.2 lib.
 *
 * 5.2 is therefore the lowest version that works across every supported
 * consumer configuration.
 */
export const MIN_TYPESCRIPT_VERSION = '5.2';

/**
 * Basename of the stub `.d.ts` emitted into every public package's dist.
 */
export const TYPESCRIPT_TOO_OLD_BASENAME = 'typescript-too-old.d.ts';

/**
 * The "exports" condition key that redirects consumers which *do* read
 * "exports" but are below {@link MIN_TYPESCRIPT_VERSION} (TypeScript 4.9 up to
 * but not including the minimum) to the stub. Must be ordered before the plain
 * `types` condition so it wins when it matches.
 */
export const TYPESCRIPT_TOO_OLD_CONDITION = `types@<${MIN_TYPESCRIPT_VERSION}`;

/**
 * The dist-relative path to the stub for a given dist directory name.
 *
 * @param {string} distDir
 * @returns {string}
 */
export function tooOldStubPath(distDir) {
  return `./${distDir}/${TYPESCRIPT_TOO_OLD_BASENAME}`;
}

/**
 * The `typesVersions` value that redirects the package root and every subpath
 * to the stub for any TypeScript that consults `typesVersions` — i.e. any
 * TypeScript that is not resolving types through "exports" (classic
 * `moduleResolution`, at any version). The `"*"` version range is used (rather
 * than `"<5.0"`) so that even a modern TypeScript misconfigured with classic
 * `moduleResolution` gets the message instead of "Cannot find module".
 *
 * @param {string} distDir
 * @returns {Record<string, Record<string, string[]>>}
 */
export function tooOldTypesVersions(distDir) {
  return {'*': {'*': [tooOldStubPath(distDir)]}};
}

/**
 * Contents of the stub `.d.ts`. The leading comment is the breadcrumb a
 * consumer sees when they jump to the resolved declaration; the unresolved
 * side-effect import surfaces the same guidance as a diagnostic for consumers
 * that are not using `skipLibCheck`.
 *
 * @returns {string}
 */
export function getTypeScriptTooOldStub() {
  return `/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// You are seeing this declaration file because your TypeScript cannot read
// Lexical's types through the package.json "exports" field.
//
// Lexical requires TypeScript >= ${MIN_TYPESCRIPT_VERSION} with "moduleResolution" set to
// "bundler", "node16", or "nodenext". To fix this:
//   1. Upgrade TypeScript to >= ${MIN_TYPESCRIPT_VERSION}.
//   2. In tsconfig.json set "moduleResolution" to "bundler" (recommended for
//      apps/bundlers) or "node16" / "nodenext", and a matching "module".
import 'Lexical requires TypeScript >=${MIN_TYPESCRIPT_VERSION} with moduleResolution bundler, node16, or nodenext';
export {};
`;
}
