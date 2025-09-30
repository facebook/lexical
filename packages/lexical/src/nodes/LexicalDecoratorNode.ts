/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {KlassConstructor, LexicalEditor} from '../LexicalEditor';
import type {ElementNode} from './LexicalElementNode';
import type {EditorConfig} from 'lexical';

import {LexicalNode} from '../LexicalNode';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface DecoratorNode<T> {
  getTopLevelElement(): ElementNode | this | null;
  getTopLevelElementOrThrow(): ElementNode | this;
}

/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class DecoratorNode<T> extends LexicalNode {
  /** @internal */
  declare ['constructor']: KlassConstructor<typeof DecoratorNode<T>>;

  /**
   * The returned value is added to the LexicalEditor._decorators
   */
  decorate(editor: LexicalEditor, config: EditorConfig): null | T {
    return null;
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
