/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {
  DevToolsNode,
  DevToolsTree,
  NodeProperties,
} from 'packages/lexical-devtools/types';
import * as React from 'react';

import TreeNode from '../TreeNode';

function TreeView({
  deHighlightDOMNode,
  handleNodeClick,
  highlightDOMNode,
  viewClassName,
  nodeMap,
}: {
  deHighlightDOMNode: (lexicalKey: string) => void;
  handleNodeClick: (props: NodeProperties) => void;
  highlightDOMNode: (lexicalKey: string) => void;
  viewClassName: string;
  nodeMap: DevToolsTree;
}): JSX.Element {
  // read CSS variable from the DOM in order to pass it to TreeNode
  const monospaceWidth = getComputedStyle(
    document.documentElement,
  ).getPropertyValue('--monospace-character-width');

  // takes flat JSON structure, nests child comments inside parents
  const depthFirstSearch = (
    map: DevToolsTree = nodeMap,
    nodeKey = 'root',
    depth = 0,
  ): DevToolsNode => {
    const node = map[nodeKey];
    const children: Array<DevToolsNode> = [];

    if (Object.prototype.hasOwnProperty.call(node, '__children')) {
      node.__children.forEach((childKey: string) => {
        children.push(depthFirstSearch(map, childKey, depth + 1));
      });
    }

    return {
      ...node,
      __type: node.__type,
      children,
      deHighlightDOMNode,
      depth,
      handleNodeClick,
      highlightDOMNode,
      lexicalKey: node.__key,
      monospaceWidth,
    };
  };

  const generateTree = (map: DevToolsTree): JSX.Element => {
    const root = depthFirstSearch(nodeMap, 'root', 0);
    return <TreeNode {...root} />;
  };

  return <div className={viewClassName}>{generateTree(nodeMap)}</div>;
}

export default TreeView;
