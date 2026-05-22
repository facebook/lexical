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
 * Convenience for the common pattern
 * `getExtensionDependencyFromEditor($getEditor(), extension)`. Must be called
 * inside an editor read/update; the active editor is resolved via
 * `$getEditor()`. Throws if the editor was not built with `extension` as a
 * dependency.
 */
export function $getExtensionDependency<E extends AnyLexicalExtension>(
  extension: E,
): LexicalExtensionDependency<E> {
  return getExtensionDependencyFromEditor($getEditor(), extension);
}

/**
 * Convenience for `$getExtensionDependency(extension).output` — the most
 * common reason to look up an extension dependency. Throws if the editor
 * was not built with `extension` as a dependency.
 */
export function $getExtensionOutput<E extends AnyLexicalExtension>(
  extension: E,
): LexicalExtensionOutput<E> {
  return $getExtensionDependency(extension).output;
}

/**
 * Convenience for the common pattern
 * `getPeerDependencyFromEditor($getEditor(), extensionName)`. Returns
 * `undefined` if the editor was not built with the named extension.
 *
 * @example
 * ```ts
 * import type {HistoryExtension} from '@lexical/history';
 * const dep = $getPeerDependency<typeof HistoryExtension>(
 *   '@lexical/history/History',
 * );
 * ```
 */
export function $getPeerDependency<E extends AnyLexicalExtension = never>(
  extensionName: E['name'],
): LexicalExtensionDependency<E> | undefined {
  return getPeerDependencyFromEditor<E>($getEditor(), extensionName);
}

/**
 * Convenience for the common pattern
 * `getPeerDependencyFromEditorOrThrow($getEditor(), extensionName)`. Throws
 * if the editor was not built with the named extension.
 */
export function $getPeerDependencyOrThrow<
  E extends AnyLexicalExtension = never,
>(extensionName: E['name']): LexicalExtensionDependency<E> {
  return getPeerDependencyFromEditorOrThrow<E>($getEditor(), extensionName);
}
