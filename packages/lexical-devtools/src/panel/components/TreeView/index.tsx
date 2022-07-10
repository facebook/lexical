/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {NodeMap} from 'lexical';

import './index.css';

import * as React from 'react';

import Node from '../Node';

function TreeView({
  viewClassName,
  nodeMap,
}: {
  viewClassName: string;
  nodeMap: NodeMap;
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
        const child = nodeMap[childKey];
        children.push(depthFirstSearch(child));
      });
    }

    branch.children = children;
    return branch;
  };

  const generateTree = (map) => {
    const root = depthFirstSearch(map.root);
    return <Node {...root} />;
  };

  return (
    <div className={viewClassName}>
      <ul>{generateTree(nodeMap)}</ul>
    </div>
  );
}

export default TreeView;
