/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import invariant from 'shared/invariant';

import {EditorConfig, KlassConstructor, LexicalEditor} from '../LexicalEditor';
import {LexicalNode} from '../LexicalNode';
import {ElementNode} from './LexicalElementNode';
import {$isNestedRootNode} from './LexicalNestedRootNode';

export class EXPERIMENTAL_DecoratorElementNode<T> extends ElementNode {
  ['constructor']!: KlassConstructor<
    typeof EXPERIMENTAL_DecoratorElementNode<T>
  >;

  /**
   * The returned value is added to the LexicalEditor._decorators
   */
  decorate(editor: LexicalEditor, config: EditorConfig): T {
    invariant(false, 'decorate: base method not extended');
  }

  splice(
    start: number,
    deleteCount: number,
    nodesToInsert: Array<LexicalNode>,
  ): this {
    for (const node of nodesToInsert) {
      invariant(
        $isNestedRootNode(node),
        'splice: only nested root nodes can be inserted',
      );
    }
    return super.splice(start, deleteCount, nodesToInsert);
  }
}

export function $isDecoratorElementNode<T>(
  node: EXPERIMENTAL_DecoratorElementNode<T> | LexicalNode | null | undefined,
): node is EXPERIMENTAL_DecoratorElementNode<T> {
  return node instanceof EXPERIMENTAL_DecoratorElementNode;
}
