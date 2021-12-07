/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {isElementNode, isTextNode, $getRoot} from 'outline';

export function $textContent(): string {
  const root = $getRoot();
  return root.getTextContent();
}

export const $textContentCurry = $textContent;

export function $isTextContentEmpty(
  isEditorComposing: boolean,
  trim?: boolean = true,
): boolean {
  if (isEditorComposing) {
    return false;
  }
  let text = $textContent();
  if (trim) {
    text = text.trim();
  }
  return text === '';
}

export function $isTextContentEmptyCurry(
  isEditorComposing: boolean,
  trim?: boolean,
): () => boolean {
  return () => $isTextContentEmpty(isEditorComposing, trim);
}

export function $canShowPlaceholder(isComposing: boolean): boolean {
  if (!$isTextContentEmpty(isComposing, false)) {
    return false;
  }
  const root = $getRoot();
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

export function canShowPlaceholderCurry(
  isEditorComposing: boolean,
): () => boolean {
  return () => $canShowPlaceholder(isEditorComposing);
}
