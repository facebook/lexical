/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import './Button.css';

import * as React from 'react';

import joinClasses from '../utils/join-classes';

export default function Button({
  children,
  onClick,
  disabled,
  small,
}: {
  children: React$Node,
  disabled?: boolean,
  onClick: () => void,
  small?: boolean,
}): React$Node {
  return (
    <button
      disabled={disabled}
      className={joinClasses(
        'Button__root',
        disabled && 'Button__disabled',
        small && 'Button__small',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
