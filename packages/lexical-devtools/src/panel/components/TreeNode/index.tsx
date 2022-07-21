/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {DevToolsNode} from 'packages/lexical-devtools/types';
import * as React from 'react';
import {Fragment} from 'react';

function TreeNode({
  __text,
  __type,
  children,
  nestingLevel,
  lexicalKey,
}: DevToolsNode): JSX.Element {
  const indentation = '  '.repeat(nestingLevel);
  const marker = children.length > 0 ? '▼ ' : '  ';
  const nodeString = ` (${lexicalKey}) ${__type} ${
    // ▶ right unicode
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
    <Fragment key={lexicalKey}>
      {indentation}
      {marker}
      {nodeString}
      {'\n'}
      {childNodes}
    </Fragment>
  );
}

export default TreeNode;
