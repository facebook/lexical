/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import stylex from 'stylex';

const styles = stylex.create({
  root: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 15,
    paddingRight: 15,
    border: 0,
    backgroundColor: '#eee',
    borderRadius: 5,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#ddd',
    },
  },
});

export default function Button({
  children,
  onClick,
}: {
  children: React$Node,
  onClick: () => void,
}): React$Node {
  return (
    <button className={stylex(styles.root)} onClick={onClick}>
      {children}
    </button>
  );
}
