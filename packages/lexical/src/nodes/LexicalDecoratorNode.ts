/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from '../LexicalEditor';
import type {NodeKey} from '../LexicalNode';

import invariant from 'shared/invariant';

import {LexicalNode} from '../LexicalNode';

export class DecoratorNode<T = unknown> extends LexicalNode {
  constructor(key?: NodeKey) {
    super(key);

    // ensure custom nodes implement required methods
    // @ts-ignore
    if (__DEV__) {
      const proto = Object.getPrototypeOf(this);
      ['decorate'].forEach((method) => {
        // eslint-disable-next-line no-prototype-builtins
        if (!proto.hasOwnProperty(method)) {
          console.warn(
            `${this.constructor.name} must implement "${method}" method`,
          );
        }
      });
    }
  }

  decorate(editor: LexicalEditor): T {
    invariant(false, 'decorate: base method not extended');
  }

  isIsolated(): boolean {
    return false;
  }

  isTopLevel(): boolean {
    return false;
  }
}

export function $isDecoratorNode<T>(
  node: LexicalNode | null | undefined,
): node is DecoratorNode<T> {
  return node instanceof DecoratorNode;
}
