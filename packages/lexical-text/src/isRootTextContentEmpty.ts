/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$rootTextContent} from './rootTextContent';

/**
 * Determines if the root has any text content and can trim any whitespace if it does.
 * @param isEditorComposing - Is the editor in composition mode due to an active Input Method Editor?
 * @param trim - Should the root text have its whitespaced trimmed? Defaults to true.
 * @returns true if text content is empty, false if there is text or isEditorComposing is true.
 */
export function $isRootTextContentEmpty(
  isEditorComposing: boolean,
  trim = true,
): boolean {
  if (isEditorComposing) {
    return false;
  }

  let text = $rootTextContent();

  if (trim) {
    text = text.trim();
  }

  return text === '';
}

/**
 * Returns a function that executes {@link $isRootTextContentEmpty}
 * @param isEditorComposing - Is the editor in composition mode due to an active Input Method Editor?
 * @param trim - Should the root text have its whitespaced trimmed? Defaults to true.
 * @returns A function that executes $isRootTextContentEmpty based on arguments.
 */
export function $isRootTextContentEmptyCurry(
  isEditorComposing: boolean,
  trim?: boolean,
): () => boolean {
  return () => $isRootTextContentEmpty(isEditorComposing, trim);
}
