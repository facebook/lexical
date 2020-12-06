// @flow strict-local

import type {OutlineEditor, View} from 'outline';

import {useCallback} from 'react';

// $FlowFixMe: TODO
type UnknownEvent = Object;
// $FlowFixMe: TODO
type UnknownState = Object;

export default function useOutlineEventWrapper<T>(
  handler: (
    event: UnknownEvent,
    view: View,
    state: UnknownState,
    editor: OutlineEditor,
  ) => void,
  editor: OutlineEditor,
  stateRef?: RefObject<T>,
): (event: UnknownEvent) => void {
  return useCallback(
    (event) => {
      const state = stateRef && stateRef.current;
      editor.update((view) => handler(event, view, state, editor));
    },
    [stateRef, editor, handler],
  );
}
