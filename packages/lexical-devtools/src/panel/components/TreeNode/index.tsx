/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {DevToolsNode} from 'packages/lexical-devtools/types';
import * as React from 'react';
import {useState} from 'react';

import Chevron from '../Chevron';

function TreeNode({
  __text,
  __type,
  children,
  deHighlightDOMNode,
  depth,
  highlightDOMNode,
  lexicalKey,
}: DevToolsNode): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleChevronClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMouseEnter: React.MouseEventHandler = (event) => {
    setIsHovered(true);
    highlightDOMNode(lexicalKey);
  };

  const handleMouseLeave: React.MouseEventHandler = (event) => {
    setIsHovered(false);
    deHighlightDOMNode(lexicalKey);
  };

  const nodeString = ` (${lexicalKey}) ${__type} ${
    __text ? '"' + __text + '"' : ''
  }`;
  const childNodes =
    children.length > 0 ? (
      <>
        {children.map((child) => (
          <TreeNode {...child} />
        ))}
      </>
    ) : (
      ''
    );

  const hoverClassName = isHovered ? ' hover' : '';
  const treeNodeClassName = 'tree-node' + hoverClassName;
  const leftIndent = depth * 1.2 + 'em';

  return (
    <div className="tree-node-wrapper" key={lexicalKey}>
      <div
        className={treeNodeClassName}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{paddingLeft: leftIndent}}>
        {children.length > 0 ? (
          <Chevron handleClick={handleChevronClick} isExpanded={isExpanded} />
        ) : (
          <span style={{width: '1.2em'}}>&nbsp;</span> // <button className="indentation">&#9654;</button>
        )}
        {nodeString}
      </div>
      {isExpanded ? childNodes : ''}
    </div>
  );
}

export default TreeNode;
