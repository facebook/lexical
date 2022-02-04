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
    fontSize: 14,
  },
  small: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 13,
  },
  disabled: {
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: '#eee',
    },
  },
});

export default function Button({
  children,
  onClick,
  disabled,
  small,
}: {
  children: React$Node,
  onClick: () => void,
  disabled?: boolean,
  small?: boolean,
}): React$Node {
  return (
    <button
      disabled={disabled}
      className={stylex(
        styles.root,
        disabled && styles.disabled,
        small && styles.small,
      )}
      onClick={onClick}>
      {children}
    </button>
  );
}
