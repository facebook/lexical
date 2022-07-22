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
import {Fragment, useState} from 'react';

import Marker from '../Marker';

function TreeNode({
  __text,
  __type,
  children,
  nestingLevel,
  lexicalKey,
}: DevToolsNode): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleMarkerClick = () => {
    setIsExpanded(!isExpanded);
  };

  const nodeString = ` (${lexicalKey}) ${__type} ${
    __text ? '"' + __text + '"' : ''
  }`;
  const childNodes =
    children.length > 0 ? (
      <Fragment>
        {children.map((child) => (
          <TreeNode {...child} />
        ))}
      </Fragment>
    ) : (
      ''
    );

  return (
    <div className="tree-node" key={lexicalKey}>
      {children.length > 0 ? (
        <Marker handleClick={handleMarkerClick} icon={isExpanded ? '▼' : '▶'} />
      ) : (
        <button className="indentation">▶</button>
      )}
      {nodeString}
      {<br />}
      {isExpanded ? childNodes : ''}
    </div>
  );
}

export default TreeNode;
