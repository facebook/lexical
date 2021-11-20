/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {UndoManager} from 'yjs';

// $FlowFixMe: need Flow typings for yjs
import {UndoManager as YjsUndoManager} from 'yjs';

// $FlowFixMe: needs proper typings
export type Provider = Object;
// $FlowFixMe: todo
export type YjsNode = Object;
// $FlowFixMe: todo
export type YjsEvent = Object;

export type {
  YjsNodeMap,
  ReverseYjsNodeMap,
  ClientID,
  Binding,
} from './Bindings';

export {createBinding} from './Bindings';

export function createUndoManager(root: YjsNode): UndoManager {
  return new YjsUndoManager(root);
}

export function initLocalState(
  provider: Provider,
  name: string,
  color: string,
  focusing: boolean,
): void {
  provider.awareness.setLocalState({
    color,
    name,
    anchorPos: null,
    focusPos: null,
    focusing: focusing,
  });
}

export function setLocalStateFocus(provider: Provider, focusing: boolean) {
  const {awareness} = provider;
  awareness.setLocalState({
    ...awareness.getLocalState(),
    focusing,
  });
}

export {syncOutlineUpdateToYjs} from './SyncOutlineToYjs';
export {syncYjsChangesToOutline} from './SyncYjsToOutline';
export {syncCursorPositions} from './SyncCursors';
