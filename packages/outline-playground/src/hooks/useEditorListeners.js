/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {PlaygroundState} from '../controllers/PlaygroundController';

import {useEffect, useState} from 'react';

export default function useEditorListeners(
  state: PlaygroundState,
  clear: () => void,
): boolean {
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const {addListener} = state;

  useEffect(() => {
    const removeReadOnlyListener = addListener('readonly', (value: boolean) => {
      setIsReadyOnly(value);
    });
    const removeClearListener = addListener('clear', () => {
      clear();
    });

    return () => {
      removeReadOnlyListener();
      removeClearListener();
    };
  });

  return isReadOnly;
}
