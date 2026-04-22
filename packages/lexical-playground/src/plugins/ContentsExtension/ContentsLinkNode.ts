/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LinkAttributes, LinkNode} from '@lexical/link';
import {
  $create,
  addClassNamesToElement,
  EditorConfig,
  LexicalNode,
} from 'lexical';

export class ContentsLinkNode extends LinkNode {
  $config() {
    return this.config('contents-link', {
      extends: LinkNode,
    });
  }

  createDOM(config: EditorConfig): HTMLAnchorElement | HTMLSpanElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.contentsLink);
    return element;
  }

  canBeEmpty(): true {
    return true;
  }
}

export function $createContentsLinkNode(
  url: string,
  attributes: LinkAttributes = {},
) {
  return $create(ContentsLinkNode)
    .setURL(url)
    .setTarget(attributes.target ?? null)
    .setRel(attributes.rel ?? null)
    .setTitle(attributes.title ?? null);
}

export function $isContentsLinkNode(node?: LexicalNode | null) {
  return node instanceof ContentsLinkNode;
}
