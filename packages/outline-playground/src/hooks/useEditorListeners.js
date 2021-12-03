/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {PlaygroundEditorContext} from '../context/PlaygroundEditorContext';
import {useContext, useEffect, useState} from 'react';

export default function useEditorListeners(
  clear: () => void,
  connected?: boolean,
  connect?: () => void,
  disconnect?: () => void,
): boolean {
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const playgroundContext = useContext(PlaygroundEditorContext);

  if (playgroundContext == null) {
    throw new Error('useEditorListeners - PlaygroundContext not found');
  }

  const {addListener, triggerListeners} = playgroundContext;
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
  }, [addListener, clear]);

  useEffect(() => {
    if (connected !== undefined) {
      triggerListeners('connected', !connected);
    }
  }, [connected, triggerListeners]);

  useEffect(() => {
    if (connect !== undefined && disconnect !== undefined) {
      return addListener('connect', () => {
        if (connected) {
          console.log('Collaboration disconnected!');
          disconnect();
        } else {
          console.log('Collaboration connected!');
          connect();
        }
      });
    }
  }, [addListener, connect, connected, disconnect]);

  return isReadOnly;
}
