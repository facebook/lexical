/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState} from 'lexical';

import {SerializedRawEditorState} from './types';

// Because we want to restore state to it's original form as it comes back from the store we need to keep original references
// this is a temporary solution that shall be replaced with a deserialization from serialized form
const deserealizationMap = new Map<number, EditorState>();
let nextId = 0;

const serializePoint = (point: object) => {
  const newPoint: {
    [key: string]: unknown;
  } = {};

  for (const [key, value] of Object.entries(point)) {
    if (key !== '_selection') {
      newPoint[key] = value;
    }
  }

  return newPoint;
};

export function deserializeEditorState(
  editorState: SerializedRawEditorState,
): EditorState {
  if (
    'deserealizationID' in editorState &&
    typeof editorState.deserealizationID === 'number'
  ) {
    const state = deserealizationMap.get(editorState.deserealizationID);
    if (state == null) {
      throw new Error(
        `Can't find deserealization ref for state with id ${editorState.deserealizationID}`,
      );
    }

    return state;
  }

  throw new Error(`State doesn't have a deserealizationID`);
}

// The existing editorState.toJSON() does not contain lexicalKeys, and selection info
// therefore, we have a custom serializeEditorState helper
export function serializeEditorState(
  editorState: EditorState,
): SerializedRawEditorState {
  const nodeMap = Object.fromEntries(editorState._nodeMap); // convert from Map structure to JSON-friendly object

  const selection = editorState._selection
    ? Object.assign({}, editorState._selection)
    : null;

  if (
    selection &&
    'anchor' in selection &&
    typeof selection.anchor === 'object' &&
    selection.anchor != null
  ) {
    // remove _selection.anchor._selection property if present in RangeSelection or GridSelection
    // otherwise, the recursive structure makes the selection object unserializable
    selection.anchor = serializePoint(selection.anchor);
  }
  if (
    selection &&
    'focus' in selection &&
    typeof selection.focus === 'object' &&
    selection.focus != null
  ) {
    // remove _selection.anchor._selection property if present in RangeSelection or GridSelection
    // otherwise, the recursive structure makes the selection object unserializable
    selection.focus = serializePoint(selection.focus);
  }

  const myID = nextId++;
  deserealizationMap.set(myID, editorState);

  return Object.assign({}, editorState, {
    _nodeMap: nodeMap,
    _selection: selection,
    deserealizationID: myID,
    toJSON: undefined,
  });
}
