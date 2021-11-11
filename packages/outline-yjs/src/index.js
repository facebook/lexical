/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type {Adapter} from './Adapter';

export {createWebsocketAdapter} from './Adapter';
export {syncOutlineUpdateToYjs, syncYjsChangesToOutline} from './Syncing';
