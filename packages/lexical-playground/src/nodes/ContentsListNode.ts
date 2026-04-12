/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ListNode} from '@lexical/list';
import {
  $create,
  addClassNamesToElement,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

export class ContentsListNode extends ListNode {
  $config() {
    return this.config('contents-list', {
      extends: ListNode,
    });
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const element = super.createDOM(config, editor);
    addClassNamesToElement(element, config.theme.contents);
    return element;
  }
}

export function $createContentsListNode() {
  return $create(ContentsListNode);
}

export function $isContentsListNode(node?: LexicalNode | null) {
  return node instanceof ContentsListNode;
}
