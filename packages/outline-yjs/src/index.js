/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {YjsNode} from './Syncing';

// $FlowFixMe: need Flow typings for yjs
import {UndoManager as YjsUndoManager} from 'yjs';

// $FlowFixMe: needs proper typings
export type Provider = Object;

// $FlowFixMe: needs proper typings
export type YjsDoc = Object;

// $FlowFixMe: needs proper typings
export type UndoManager = Object;

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
): void {
  provider.awareness.setLocalState({
    color,
    name,
    anchorPos: null,
    focusPos: null,
  });
}

export {
  syncOutlineUpdateToYjs,
  syncYjsChangesToOutline,
  syncCursorPositions,
} from './Syncing';
