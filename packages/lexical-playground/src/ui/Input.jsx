/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import './Input.css';

import * as React from 'react';

type Props = $ReadOnly<
  {
    label: string,
  } & React.ElementProps<'input'>,
>;

export default function Input({
  label,
  placeholder = '',
  type = 'text',
  ...other
}: Props): React$Node {
  return (
    <div className="Input__wrapper">
      <label className="Input__label">{label}</label>
      <input
        {...other}
        type={type}
        className="Input__input"
        placeholder={placeholder}
      />
    </div>
  );
}
