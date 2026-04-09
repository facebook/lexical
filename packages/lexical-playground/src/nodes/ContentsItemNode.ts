/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ListItemNode} from '@lexical/list';
import {EditorConfig, ElementNode} from 'lexical';

import {$createContentsListNode} from './ContentsListNode';

export class ContentsItemNode extends ListItemNode {
  $config() {
    return this.config('contents-item', {
      extends: ListItemNode,
    });
  }

  createParentElementNode(): ElementNode {
    return $createContentsListNode();
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.classList.add(config.theme.contentsItem);
    return element;
  }
}

export function $createContentsItemNode() {
  return new ContentsItemNode();
}
