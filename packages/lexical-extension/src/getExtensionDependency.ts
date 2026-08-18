/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getEditor,
  type AnyLexicalExtension,
  type LexicalExtensionDependency,
  type LexicalExtensionOutput,
} from 'lexical';

import {getExtensionDependencyFromEditor} from './getExtensionDependencyFromEditor';
import {getPeerDependencyFromEditor} from './getPeerDependencyFromEditor';

/**
 * Get the finalized config and output for `extension` from the editor
 * currently in scope. A `$`-flavored shorthand for
 * `getExtensionDependencyFromEditor($getEditor(), extension)`.
 *
 * Throws if the editor was not built with `extension` as a dependency.
 *
 * @example
 * ```ts
 * import {$getExtensionDependency} from '@lexical/extension';
 * import {KeywordsExtension} from './KeywordsExtension';
 *
 * class KeywordNode extends TextNode {
 *   createDOM(config: EditorConfig): HTMLElement {
 *     const dom = super.createDOM(config);
 *     dom.className =
 *       $getExtensionDependency(KeywordsExtension).config.className;
 *     return dom;
 *   }
 * }
 * ```
 *
 * @see {@link getExtensionDependencyFromEditor} when you have an explicit
 *   editor reference (e.g. outside a read/update).
 */
export function $getExtensionDependency<E extends AnyLexicalExtension>(
  extension: E,
): LexicalExtensionDependency<E> {
  return getExtensionDependencyFromEditor($getEditor(), extension);
}

/**
 * Shorthand for `$getExtensionDependency(extension).output` — the most
 * common reason to look up an extension dependency. Throws if the editor
 * was not built with `extension` as a dependency.
 *
 * @example
 * ```ts
 * import {$getExtensionOutput} from '@lexical/extension';
 * import {DOMImportExtension} from '@lexical/html';
 *
 * const nodes = $getExtensionOutput(DOMImportExtension).$generateNodesFromDOM(
 *   dom,
 * );
 * ```
 *
 * @see {@link $getExtensionDependency} when you need both `.config` and
 *   `.output` (or want to mirror the shape of
 *   {@link getExtensionDependencyFromEditor}).
 */
export function $getExtensionOutput<E extends AnyLexicalExtension>(
  extension: E,
): LexicalExtensionOutput<E> {
  return $getExtensionDependency(extension).output;
}

/**
 * Get the finalized config and output for an optional peer extension by
 * name, from the editor currently in scope. A `$`-flavored shorthand for
 * `getPeerDependencyFromEditor($getEditor(), extensionName)`.
 *
 * Returns `undefined` if the editor was not built with the named
 * extension. Both the explicit `Extension` type and the name are
 * required so the returned `config` / `output` types are correct.
 *
 * @example
 * ```ts
 * import {$getPeerDependency} from '@lexical/extension';
 * import type {HistoryExtension} from '@lexical/history';
 *
 * const dep = $getPeerDependency<typeof HistoryExtension>(
 *   '@lexical/history/History',
 * );
 * if (dep) {
 *   // …read dep.config / dep.output…
 * }
 * ```
 *
 * @see {@link getPeerDependencyFromEditor} when you have an explicit
 *   editor reference.
 */
export function $getPeerDependency<E extends AnyLexicalExtension = never>(
  extensionName: E['name'],
): LexicalExtensionDependency<E> | undefined {
  return getPeerDependencyFromEditor<E>($getEditor(), extensionName);
}
