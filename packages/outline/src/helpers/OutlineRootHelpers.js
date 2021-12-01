/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {State} from 'outline';

import {isElementNode, isTextNode} from 'outline';

export function textContent(state: State): string {
  const root = state.getRoot();
  return root.getTextContent();
}

export const textContent2 = textContent;
export const textContentCurry = textContent;

export function isTextContentEmpty(
  state: State,
  isEditorComposing: boolean,
  trim?: boolean = true,
): boolean {
  if (isEditorComposing) {
    return false;
  }
  let text = textContent(state);
  if (trim) {
    text = text.trim();
  }
  return text === '';
}

export const isBlank = isTextContentEmpty;
export const isBlank2 = isTextContentEmpty;

export function isTextContentEmptyCurry(
  isEditorComposing: boolean,
  trim?: boolean,
): (state: State) => boolean {
  return (state: State) => isTextContentEmpty(state, isEditorComposing, trim);
}

export function canShowPlaceholder(
  state: State,
  isComposing: boolean,
): boolean {
  if (!isTextContentEmpty(state, isComposing, false)) {
    return false;
  }
  const root = state.getRoot();
  const children = root.getChildren();
  const childrenLength = children.length;
  if (childrenLength > 1) {
    return false;
  }
  for (let i = 0; i < childrenLength; i++) {
    const topBlock = children[i];

    if (isElementNode(topBlock)) {
      if (topBlock.__type !== 'paragraph') {
        return false;
      }
      if (topBlock.__indent !== 0) {
        return false;
      }
      const topBlockChildren = topBlock.getChildren();
      const topBlockChildrenLength = topBlockChildren.length;
      for (let s = 0; s < topBlockChildrenLength; s++) {
        const child = topBlockChildren[i];
        if (!isTextNode(child)) {
          return false;
        }
      }
    }
  }
  return true;
}

export const canShowPlaceholder2 = canShowPlaceholder;

export function canShowPlaceholderCurry(
  isEditorComposing: boolean,
): (state: State) => boolean {
  return (state: State) => canShowPlaceholder(state, isEditorComposing);
}
