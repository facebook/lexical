/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';

import './Input.css';

export default function Input({
  label,
  value,
  onChange,
}: {
  label: string,
  onChange: (string) => void,
  value: string,
}): React$Node {
  return (
    <div className="Input__wrapper">
      <label className="Input__label">{label}</label>
      <input
        type="text"
        className="Input__input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}
