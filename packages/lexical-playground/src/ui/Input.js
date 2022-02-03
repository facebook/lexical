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
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    display: 'flex',
    flex: 1,
    color: '#666',
  },
  input: {
    display: 'flex',
    flex: 2,
    border: '1px solid #999',
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 16,
    borderRadius: 5,
  },
});

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
    <div className={stylex(styles.wrapper)}>
      <label className={stylex(styles.label)}>{label}</label>
      <input
        type="text"
        className={stylex(styles.input)}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}
