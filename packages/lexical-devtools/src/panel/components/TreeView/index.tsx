/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {DevToolsNode, DevToolsTree} from 'packages/lexical-devtools/types';
import * as React from 'react';

import TreeNode from '../TreeNode';

function TreeView({
  viewClassName,
  nodeMap,
}: {
  viewClassName: string;
  nodeMap: DevToolsTree;
}): JSX.Element {
  // takes flat JSON structure, nests child comments inside parents
  const depthFirstSearch = (
    node: DevToolsNode,
    depth: number,
  ): DevToolsNode => {
    const children: Array<DevToolsNode> = [];

    if (Object.prototype.hasOwnProperty.call(node, '__children')) {
      node.__children.forEach((childKey: string) => {
        const child = nodeMap[childKey];
        children.push(depthFirstSearch(child, depth + 1)); // recursive call
      });
    }

    return {
      ...node,
      __type: node.__type,
      children,
      depth,
      lexicalKey: node.__key,
    };
  };

  const generateTree = (map: DevToolsTree): JSX.Element => {
    const root = depthFirstSearch(map.root, 0);
    return <TreeNode {...root} />;
  };

  return <div className={viewClassName}>{generateTree(nodeMap)}</div>;
}

export default TreeView;
