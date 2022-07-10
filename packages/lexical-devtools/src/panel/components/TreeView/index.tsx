/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {EditorState} from 'lexical';

import './index.css';

import * as React from 'react';

import Node from '../Node';

function TreeView({
  viewClassName,
  editorState,
}: {
  viewClassName: string;
  editorState: EditorState;
}): JSX.Element {
  const depthFirstSearch = (node) => {
    const {
      __cachedText: cachedText,
      __key: lexicalKey,
      __text: text,
      __type: type,
    } = node;
    const branch = {cachedText, lexicalKey, text, type};

    const children = [];

    if (Object.prototype.hasOwnProperty.call(node, '__children')) {
      node.__children.forEach((childKey) => {
        const child = editorState.get(childKey);
        children.push(depthFirstSearch(child));
      });
    }

    branch.children = children;
    return branch;
  };

  const generateTree = (nodeMap) => {
    const root = depthFirstSearch(nodeMap.get('root'));
    return <Node {...root} />;
  };

  return (
    <div className={viewClassName}>
      <ul>{generateTree(editorState)}</ul>
    </div>
  );
}

export default TreeView;
