/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React from 'react';

import {useSearchName} from '../utils';
import styles from './styles.module.css';

export default function SearchBar() {
  const [searchName, setSearchName] = useSearchName();
  return (
    <div className={styles.searchBar}>
      <input
        placeholder={'Search for plugin...'}
        value={searchName}
        onInput={(e) => {
          setSearchName(e.currentTarget.value);
        }}
      />
    </div>
  );
}
