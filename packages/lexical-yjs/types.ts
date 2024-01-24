/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CollabDecoratorNode} from './src/CollabDecoratorNode';
import {CollabElementNode} from './src/CollabElementNode';
import {CollabLineBreakNode} from './src/CollabLineBreakNode';
import {CollabTextNode} from './src/CollabTextNode';

declare module 'yjs' {
  interface XmlElement {
    _collabNode: CollabDecoratorNode;
  }

  interface XmlText {
    _collabNode: CollabElementNode;
  }
}

declare module 'yjs/dist/src/internals' {
  // @ts-ignore
  interface YMap {
    _collabNode: CollabLineBreakNode | CollabTextNode;
  }
}
