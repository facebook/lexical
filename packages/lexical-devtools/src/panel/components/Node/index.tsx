/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as React from 'react';

function Node({
  lexicalKey,
  text,
  type,
  children,
}: {
  children: Array<object>;
  lexicalKey: string;
  text: string;
  type: string;
}): JSX.Element {
  return (
    <li key={lexicalKey}>
      ({lexicalKey}) {type} {text ? '"' + text + '"' : ''}
      {children.length > 0 ? (
        <ul>
          {children.map((child) => (
            <Node {...child} />
          ))}
        </ul>
      ) : (
        ''
      )}
    </li>
  );
}

export default Node;
