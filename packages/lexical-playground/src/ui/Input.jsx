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

type Props = $ReadOnly<{
  label: string,
  onChange: (string) => void,
  placeholder?: string,
  value: string,
}>;

export default function Input({
  label,
  value,
  onChange,
  placeholder = '',
}: Props): React$Node {
  return (
    <div className="Input__wrapper">
      <label className="Input__label">{label}</label>
      <input
        type="text"
        className="Input__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}
