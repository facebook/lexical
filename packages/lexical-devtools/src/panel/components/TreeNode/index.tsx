/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {DevToolsNode} from 'packages/lexical-devtools/types';
import * as React from 'react';

function TreeNode({
  lexicalKey,
  __text,
  __type,
  children,
}: {
  children: Array<DevToolsNode>;
  lexicalKey: string;
  __text?: string;
  __type: string;
}): JSX.Element {
  return (
    <li key={lexicalKey}>
      ({lexicalKey}) {__type} {__text ? '"' + __text + '"' : ''}
      {children.length > 0 ? (
        <ul>
          {children.map((child) => (
            <TreeNode {...child} />
          ))}
        </ul>
      ) : (
        ''
      )}
    </li>
  );
}

export default TreeNode;
