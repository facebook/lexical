/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import {MenuOption} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  LexicalEditor,
} from 'lexical';

export const ICON_URLS = {
  bullet: '/img/list-ul.svg',
  h1: '/img/type-h1.svg',
  h2: '/img/type-h2.svg',
  h3: '/img/type-h3.svg',
  number: '/img/list-ol.svg',
  paragraph: '/img/text-paragraph.svg',
  quote: '/img/chat-square-quote.svg',
} as const;

export type IconKey = keyof typeof ICON_URLS;

interface BlockOptionConfig {
  iconKey: IconKey;
  keywords?: string[];
  onSelect: () => void;
}

export class BlockOption extends MenuOption {
  title: string;
  iconKey: IconKey;
  keywords: string[];
  onSelect: () => void;

  constructor(
    title: string,
    {iconKey, keywords = [], onSelect}: BlockOptionConfig,
  ) {
    super(title);
    this.title = title;
    this.iconKey = iconKey;
    this.keywords = keywords;
    this.onSelect = onSelect;
  }
}

export function getBlockOptions(editor: LexicalEditor): BlockOption[] {
  return [
    new BlockOption('Text', {
      iconKey: 'paragraph',
      keywords: ['paragraph', 'text', 'p', 'normal'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        }),
    }),
    new BlockOption('Heading 1', {
      iconKey: 'h1',
      keywords: ['heading', 'title', 'h1'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h1'));
          }
        }),
    }),
    new BlockOption('Heading 2', {
      iconKey: 'h2',
      keywords: ['heading', 'subtitle', 'h2'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h2'));
          }
        }),
    }),
    new BlockOption('Heading 3', {
      iconKey: 'h3',
      keywords: ['heading', 'h3'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h3'));
          }
        }),
    }),
    new BlockOption('Bulleted List', {
      iconKey: 'bullet',
      keywords: ['bulleted list', 'unordered list', 'ul'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    }),
    new BlockOption('Numbered List', {
      iconKey: 'number',
      keywords: ['numbered list', 'ordered list', 'ol'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    }),
    new BlockOption('Quote', {
      iconKey: 'quote',
      keywords: ['quote', 'blockquote'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        }),
    }),
  ];
}
