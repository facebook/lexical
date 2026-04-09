/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ListNode} from '@lexical/list';
import {EditorConfig, LexicalEditor} from 'lexical';

export class ContentsListNode extends ListNode {
  $config() {
    return this.config('contents-list', {
      extends: ListNode,
    });
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const element = super.createDOM(config, editor);
    element.style.listStyle = 'none';
    element.classList.add(config.theme.contents);
    return element;
  }
}

export function $createContentsListNode() {
  return new ContentsListNode();
}
