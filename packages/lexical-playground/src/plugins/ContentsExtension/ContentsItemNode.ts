/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ListItemNode} from '@lexical/list';
import {$create, addClassNamesToElement, EditorConfig} from 'lexical';

import {$createContentsListNode, ContentsListNode} from './ContentsListNode';

export class ContentsItemNode extends ListItemNode {
  $config() {
    return this.config('contents-item', {
      extends: ListItemNode,
    });
  }

  createParentElementNode(): ContentsListNode {
    return $createContentsListNode();
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.contentsItem);
    return element;
  }
}

export function $createContentsItemNode() {
  return $create(ContentsItemNode);
}
