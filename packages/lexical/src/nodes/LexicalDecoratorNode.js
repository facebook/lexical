/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from '../LexicalEditor';
import type {NodeKey} from '../LexicalNode';

import invariant from 'shared/invariant';

import {LexicalNode} from '../LexicalNode';

export class DecoratorNode extends LexicalNode {
  constructor(key?: NodeKey): void {
    super(key);

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

  decorate(editor: LexicalEditor): mixed {
    invariant(false, 'decorate: base method not extended');
  }

  isIsolated(): boolean {
    return false;
  }

  isTopLevel(): boolean {
    return false;
  }
}

export function $isDecoratorNode(node: ?LexicalNode): boolean %checks {
  return node instanceof DecoratorNode;
}
