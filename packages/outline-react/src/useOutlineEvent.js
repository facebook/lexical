/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, View} from 'outline';

import {useEffect} from 'react';
import useOutlineEventWrapper from 'outline-react/useOutlineEventWrapper';

// $FlowFixMe: TODO
type UnknownEvent = Object;

export default function useOutlineEvent<T>(
  editor: OutlineEditor,
  eventName: string,
  handler: (event: UnknownEvent, view: View) => void,
  stateRef?: RefObject<T>,
): void {
  const wrapper = useOutlineEventWrapper(handler, editor, stateRef);
  useEffect(() => {
    const target =
      eventName === 'selectionchange' ? document : editor.getEditorElement();

    if (target !== null) {
      // $FlowFixMe
      target.addEventListener(eventName, wrapper);
      return () => {
        // $FlowFixMe
        target.removeEventListener(eventName, wrapper);
      };
    }
  }, [eventName, editor, wrapper]);
}
