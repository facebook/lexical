/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, State} from 'outline';

import {getEditorStateTextContent} from '../core/OutlineUtils';
import {isBlockNode, isTextNode} from 'outline';

export function textContent2(state: State): string {
  const root = state.getRoot();
  return root.getTextContent();
}

export function isBlank2(
  state: State,
  isEditorComposing: boolean,
  trim?: boolean = true,
): boolean {
  if (isEditorComposing) {
    return false;
  }
  let text = textContent2(state);
  if (trim) {
    text = text.trim();
  }
  return text === '';
}

export function canShowPlaceholder2(
  state: State,
  isComposing: boolean,
): boolean {
  if (!isBlank2(state, isComposing, false)) {
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

    if (isBlockNode(topBlock)) {
      if (topBlock.__type !== 'paragraph') {
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

// Deprecated
export function textContent(editorState: EditorState): string {
  return getEditorStateTextContent(editorState);
}

// Deprecated
export function isBlank(
  editorState: EditorState,
  isEditorComposing: boolean,
  trim?: boolean = true,
): boolean {
  if (isEditorComposing) {
    return false;
  }
  let text = getEditorStateTextContent(editorState);
  if (trim) {
    text = text.trim();
  }
  return text === '';
}

// Deprecated
export function canShowPlaceholder(
  editorState: EditorState,
  isComposing: boolean,
): boolean {
  if (!isBlank(editorState, isComposing, false)) {
    return false;
  }
  const nodeMap = editorState._nodeMap;
  // $FlowFixMe: root is always in the Map
  const root = ((nodeMap.get('root'): any): RootNode);
  const topBlockIDs = root.__children;
  const topBlockIDsLength = topBlockIDs.length;
  if (topBlockIDsLength > 1) {
    return false;
  }
  for (let i = 0; i < topBlockIDsLength; i++) {
    const topBlock = nodeMap.get(topBlockIDs[i]);

    if (isBlockNode(topBlock)) {
      if (topBlock.__type !== 'paragraph') {
        return false;
      }
      const children = topBlock.__children;
      for (let s = 0; s < children.length; s++) {
        const child = nodeMap.get(children[s]);
        if (!isTextNode(child)) {
          return false;
        }
      }
    }
  }
  return true;
}
