/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';
import type {NodeKey} from './LexicalNode';
import type {Node as ReactNode} from 'react';
import type {LexicalRef} from './LexicalReference';

import {LexicalNode} from './LexicalNode';
import invariant from 'shared/invariant';

export class DecoratorNode extends LexicalNode {
  __ref: null | LexicalRef;

  constructor(ref?: null | LexicalRef, key?: NodeKey): void {
    super(key);
    this.__ref = ref || null;

    // ensure custom nodes implement required methods
    if (__DEV__) {
      const proto = Object.getPrototypeOf(this);
      ['decorate'].forEach((method) => {
        if (!proto.hasOwnProperty(method)) {
          console.warn(
            `${this.constructor.name} must implement "${method}" method`,
          );
        }
      });
    }
  }

  decorate(editor: LexicalEditor): ReactNode {
    invariant(false, 'decorate: base method not extended');
  }
}

export function $isDecoratorNode(node: ?LexicalNode): boolean %checks {
  return node instanceof DecoratorNode;
}
