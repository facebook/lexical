/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyLexicalExtension,
  LexicalExtensionDependency,
  LexicalExtensionOutput,
} from 'lexical';

import {$getEditor} from 'lexical';

import {getExtensionDependencyFromEditor} from './getExtensionDependencyFromEditor';
import {
  getPeerDependencyFromEditor,
  getPeerDependencyFromEditorOrThrow,
} from './getPeerDependencyFromEditor';

/**
 * Get the finalized config and output for `extension` from the editor
 * currently in scope. A `$`-flavored shorthand for
 * `getExtensionDependencyFromEditor($getEditor(), extension)` — must be
 * called inside an editor read/update (e.g. from a node method, a rule
 * body, or any code reachable from `editor.read` / `editor.update`).
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
 * common reason to look up an extension dependency. Must be called inside
 * an editor read/update; throws if the editor was not built with
 * `extension` as a dependency.
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
 * `getPeerDependencyFromEditor($getEditor(), extensionName)` — must be
 * called inside an editor read/update.
 *
 * Returns `undefined` if the editor was not built with the named
 * extension; use {@link $getPeerDependencyOrThrow} when missing the peer
 * should be an error. Both the explicit `Extension` type and the name
 * are required so the returned `config` / `output` types are correct.
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

/**
 * Throwing variant of {@link $getPeerDependency}: get the finalized
 * config and output for a peer extension by name from the editor in
 * scope, and throw if the editor was not built with that extension.
 *
 * Convenient when the surrounding code can't proceed without the peer
 * (e.g. a custom node that reads a peer extension's config in
 * `createDOM`).
 *
 * @example
 * ```ts
 * import {$getPeerDependencyOrThrow} from '@lexical/extension';
 * import type {EmojiExtension} from './EmojiExtension';
 *
 * class EmojiNode extends TextNode {
 *   createDOM(config: EditorConfig): HTMLElement {
 *     const dom = super.createDOM(config);
 *     dom.classList.add(
 *       $getPeerDependencyOrThrow<typeof EmojiExtension>(
 *         '@lexical/playground/emoji',
 *       ).config.emojiClass,
 *     );
 *     return dom;
 *   }
 * }
 * ```
 *
 * @see {@link getPeerDependencyFromEditorOrThrow} when you have an
 *   explicit editor reference.
 */
export function $getPeerDependencyOrThrow<
  E extends AnyLexicalExtension = never,
>(extensionName: E['name']): LexicalExtensionDependency<E> {
  return getPeerDependencyFromEditorOrThrow<E>($getEditor(), extensionName);
}
