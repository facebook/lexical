/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from '../LexicalEditor';
import type {NodeKey} from '../LexicalNode';

import {EditorConfig} from 'lexical';
import invariant from 'shared/invariant';

import {LexicalNode} from '../LexicalNode';

/** @noInheritDoc */
export class DecoratorNode<T> extends LexicalNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  decorate(editor: LexicalEditor, config: EditorConfig): T {
    invariant(false, 'decorate: base method not extended');
  }

  isIsolated(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }
}

export function $isDecoratorNode<T>(
  node: LexicalNode | null | undefined,
): node is DecoratorNode<T> {
  return node instanceof DecoratorNode;
}
