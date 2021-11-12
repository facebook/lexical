/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe: needs proper typings
export type Provider = Object;

// $FlowFixMe: needs proper typings
export type YjsDoc = Object;

export type {
  YjsNodeMap,
  ReverseYjsNodeMap,
  ClientID,
  Binding
} from './Bindings'

export {createBinding} from './Bindings';

export {
  syncOutlineUpdateToYjs,
  syncYjsChangesToOutline,
  syncCursorPositions,
} from './Syncing';
