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
  accept?: string,
  label: string,
  onChange: React.ElementProps<'input'>['onChange'],
  placeholder?: string,
  type?: string,
  value?: string,
}>;

export default function Input({
  accept,
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
}: Props): React$Node {
  return (
    <div className="Input__wrapper">
      <label className="Input__label">{label}</label>
      <input
        type={type}
        value={value || undefined}
        accept={accept || undefined}
        className="Input__input"
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
}
