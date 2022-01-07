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
    fontSize: 15,
    color: '#999',
    overflow: 'hidden',
    position: 'absolute',
    textOverflow: 'ellipsis',
    top: 10,
    left: 10,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    display: 'inline-block',
    pointerEvents: 'none',
  },
});

export default function Placeholder({
  children,
  className,
}: {
  children: string,
  className?: string,
}): React$Node {
  return <div className={className || stylex(styles.root)}>{children}</div>;
}
