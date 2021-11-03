/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState} from 'outline';

import {getEditorStateTextContent} from '../core/OutlineUtils';
import {isBlockNode, isTextNode} from 'outline';

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
