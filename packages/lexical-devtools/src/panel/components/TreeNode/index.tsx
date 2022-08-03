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
  monospaceWidth,
}: DevToolsNode): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleChevronClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMouseEnter: React.MouseEventHandler = (event) => {
    highlightDOMNode(lexicalKey);
  };

  const handleMouseLeave: React.MouseEventHandler = (event) => {
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

  const leftIndent = depth * parseFloat(monospaceWidth) + 'em';

  return (
    <div className="tree-node-wrapper" key={lexicalKey}>
      <div
        className="tree-node"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{paddingLeft: leftIndent}}>
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
