/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CollabDecoratorNode} from './CollabDecoratorNode';
import type {CollabElementNode} from './CollabElementNode';
import type {CollabLineBreakNode} from './CollabLineBreakNode';
import type {CollabTextNode} from './CollabTextNode';

declare module 'yjs' {
  interface XmlElement {
    _collabNode: CollabDecoratorNode;
  }

  interface XmlText {
    _collabNode: CollabElementNode;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Map<MapType> {
    _collabNode: CollabLineBreakNode | CollabTextNode;
  }
}
