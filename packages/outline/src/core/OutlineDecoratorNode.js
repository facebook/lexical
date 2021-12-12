/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {NodeKey} from './OutlineNode';
import type {Node as ReactNode} from 'react';
import type {OutlineRef} from './OutlineReference';

import {OutlineNode} from './OutlineNode';
import invariant from 'shared/invariant';

export class DecoratorNode extends OutlineNode {
  __ref: null | OutlineRef;

  constructor(ref?: null | OutlineRef, key?: NodeKey): void {
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

  decorate(editor: OutlineEditor): ReactNode {
    invariant(false, 'decorate: base method not extended');
  }
}

export function $isDecoratorNode(node: ?OutlineNode): boolean %checks {
  return node instanceof DecoratorNode;
}
