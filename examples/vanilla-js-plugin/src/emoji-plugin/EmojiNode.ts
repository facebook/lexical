/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $create,
  $getState,
  $getStateChange,
  $setState,
  createState,
  type EditorConfig,
  TextNode,
} from 'lexical';

// @emoji-datasource-facebook is defined in vite.config.ts
const emojiImages = new Map(
  Object.entries(
    import.meta.glob<string>('@emoji-datasource-facebook/*.png', {
      eager: true,
      import: 'default',
      query: '?url&no-inline',
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1), url]),
);

function getEmojiBackground(unifiedID: string): string {
  const url = emojiImages.get(`${unifiedID}.png`);
  return url ? `url('${url}')` : '';
}

const unifiedIDState = createState('unifiedID', {
  parse: value => (typeof value === 'string' ? value.toLowerCase() : ''),
});

export class EmojiNode extends TextNode {
  $config() {
    return this.config('emoji', {
      extends: TextNode,
      stateConfigs: [{flat: true, stateConfig: unifiedIDState}],
    });
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add('emoji-node');
    dom.style.backgroundImage = getEmojiBackground(
      $getState(this, unifiedIDState),
    );
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    if (super.updateDOM(prevNode, dom, config)) {
      return true;
    }
    const change = $getStateChange(this, prevNode, unifiedIDState);
    if (change !== null) {
      dom.style.backgroundImage = getEmojiBackground(change[0]);
    }
    return false;
  }
}

export function $createEmojiNode(unifiedID: string): EmojiNode {
  const text = String.fromCodePoint(
    ...unifiedID.split('-').map(value => parseInt(value, 16)),
  );
  return $setState(
    $create(EmojiNode).setTextContent(text).setMode('token'),
    unifiedIDState,
    unifiedID.toLowerCase(),
  );
}
