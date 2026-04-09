/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LinkNode} from '@lexical/link';
import {EditorConfig} from 'lexical';

export class ContentsLinkNode extends LinkNode {
  $config() {
    return this.config('contents-link', {
      extends: LinkNode,
    });
  }

  createDOM(config: EditorConfig): HTMLAnchorElement | HTMLSpanElement {
    const element = super.createDOM(config);
    element.classList.add(config.theme.contentsLink);
    return element;
  }

  canBeEmpty(): true {
    return true;
  }
}

export function $createContentsLinkNode(url: string) {
  return new ContentsLinkNode(url);
}
