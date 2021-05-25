/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';

import {RTL_REGEX, LTR_REGEX} from './OutlineConstants';

export const emptyFunction = () => {};

let keyCounter = 0;

// invariant(condition, message) will refine types based on "condition", and
// if "condition" is false will throw an error. This function is special-cased
// in flow itself, so we can't name it anything else.
export function invariant(
  condition: boolean,
  format: string,
  ...args: Array<string>
) {
  throw new Error(
    'Internal Outline error: invariant() is meant to be replaced at compile ' +
      'time. There is no runtime version.',
  );
}

export function generateRandomKey(): string {
  return '_' + keyCounter++;
}

// When we are dealing with setting selection on an empty text node, we
// need to apply some heuristics that alter the selection anchor. Specifically,
// if the text node is the start of a block or new line, the anchor should be in
// position 0. Otherwise, it should be in position 1. This is becasue we use the
// BYTE_ORDER_MARK character as a way of giving the empty text node some physical
// space so that browsers correctly insert text into them. The reason we need to
// apply heuristics around if we should use 0 or 1 is because of how we insertText.
// We let the browser natively insert text, but this can cause issues on a new block
// with things like autocorrect and the software keyboard suggestions. Conversely,
// IME input can break if the anchor is not at 1 in other cases.
export function getAdjustedSelectionOffset(anchorDOM: Node): number {
  const previousSibling = anchorDOM.previousSibling;
  return previousSibling == null || previousSibling.nodeName === 'BR' ? 0 : 1;
}

export const isArray = Array.isArray;

const NativePromise = window.Promise;

export const scheduleMicroTask: (fn: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => NativePromise.resolve().then(fn);

export function isSelectionWithinEditor(
  editor: OutlineEditor,
  anchorDOM: Node,
  focusDOM: Node,
): boolean {
  const editorElement = editor.getEditorElement();
  return (
    editorElement !== null &&
    editorElement.contains(anchorDOM) &&
    editorElement.contains(focusDOM)
  );
}

export function getTextDirection(text: string): 'ltr' | 'rtl' | null {
  if (RTL_REGEX.test(text)) {
    return 'rtl';
  }
  if (LTR_REGEX.test(text)) {
    return 'ltr';
  }
  return null;
}
