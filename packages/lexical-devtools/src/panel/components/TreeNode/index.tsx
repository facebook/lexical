/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {DevToolsNode, NodeProperties} from 'packages/lexical-devtools/types';
import * as React from 'react';
import {useState} from 'react';

import Chevron from '../Chevron';

function TreeNode({
  __text,
  __type,
  children,
  deHighlightDOMNode,
  depth,
  handleNodeClick,
  highlightDOMNode,
  lexicalKey,
  monospaceWidth,
  ...rest
}: DevToolsNode): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleChevronClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMouseEnter: React.MouseEventHandler = () => {
    highlightDOMNode(lexicalKey);
  };

  const handleMouseLeave: React.MouseEventHandler = () => {
    deHighlightDOMNode(lexicalKey);
  };

  const handleClick: React.MouseEventHandler = () => {
    const nodeProps: NodeProperties = {__type, ...rest};
    if (__text) {
      nodeProps.__text = __text;
    }
    handleNodeClick(nodeProps);
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

  const leftIndent = depth * parseFloat(monospaceWidth) + 'em';

  return (
    <div className="tree-node-wrapper" key={lexicalKey}>
      <div
        className="tree-node"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="menuitem"
        style={{paddingLeft: leftIndent}}
        tabIndex={0}>
        <span style={{width: 'var(--monospace-character-width)'}}>&nbsp;</span>
        {children.length > 0 ? (
          <Chevron handleClick={handleChevronClick} isExpanded={isExpanded} />
        ) : (
          <span style={{width: 'var(--monospace-character-width)'}}>
            &nbsp;
          </span>
        )}
        {nodeString}
      </div>
      {isExpanded ? childNodes : ''}
    </div>
  );
}

export default TreeNode;
