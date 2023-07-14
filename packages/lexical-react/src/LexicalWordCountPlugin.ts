/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getRoot, $isParagraphNode, NodeKey, TextNode} from 'lexical';
import {useEffect, useState} from 'react';

const PUNCTUATION = [
  ',',
  '，',
  '.',
  '。',
  ':',
  '：',
  ';',
  '；',
  '[',
  ']',
  '【',
  ']',
  '】',
  '{',
  '｛',
  '}',
  '｝',
  '(',
  '（',
  ')',
  '）',
  '<',
  '《',
  '>',
  '》',
  '$',
  '￥',
  '!',
  '！',
  '?',
  '？',
  '~',
  '～',
  "'",
  '’',
  '"',
  '“',
  '”',
  '*',
  '/',
  '\\',
  '&',
  '%',
  '@',
  '#',
  '^',
  '、',
  '、',
  '、',
  '、',
];

// Got from https://github.com/byn9826/words-count/blob/master/src/globalWordsCount.js
function getWordCountOfTextNode(text: string): number {
  if (text.length === 0 || text.trim() === '') return 0;

  // Change punctuation to empty space
  const punctuationRegex = new RegExp('\\' + PUNCTUATION.join(' '), 'g');
  text = text.replace(punctuationRegex, ' ');

  // Remove all kind of symbols
  text = text.replace(/[\uFF00-\uFFEF\u2000-\u206F]/g, '');

  // Format white space character
  text = text.replace(/\s+/, ' ');

  // Split text by white space (For European languages)
  let words = text.split(' ');

  words = words.filter((word: string) => word.trim());

  // Match latin, cyrillic, Malayalam letters and numbers
  const common =
    '(\\d+)|[a-zA-Z\u00C0-\u00FF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u1E00-\u1EFF\u0400-\u04FF\u0500-\u052F\u0D00-\u0D7F]+|';

  // Match Chinese Hànzì, the Japanese Kanji and the Korean Hanja
  const cjk =
    '\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\u3400-\u3FFF\u4000-\u4DBF\u4E00-\u4FFF\u5000-\u5FFF\u6000-\u6FFF\u7000-\u7FFF\u8000-\u8FFF\u9000-\u9FFF\uF900-\uFAFF';

  // Match Japanese Hiragana, Katakana, Rōmaji
  const jp = '\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3190-\u319F';

  // Match Korean Hangul
  const kr =
    '\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uAFFF\uB000-\uBFFF\uC000-\uCFFF\uD000-\uD7AF\uD7B0-\uD7FF';

  // eslint-disable-next-line no-misleading-character-class
  const regex = new RegExp(common + '[' + cjk + jp + kr + ']', 'g');
  let finalTextWords: string[] = [];
  words.forEach((word: string) => {
    // Stores the matached charecters so we can treat them as seperate words (as per the grammer of these langaues)
    const charecterWords = [];
    let matched;
    do {
      matched = regex.exec(word);
      if (matched) charecterWords.push(matched[0]);
    } while (matched);
    if (charecterWords.length === 0) {
      finalTextWords.push(word);
    } else {
      finalTextWords = finalTextWords.concat(charecterWords);
    }
  });

  return finalTextWords.length;
}

export default function WordCountPlugin(): [string[], number] {
  const [editor] = useLexicalComposerContext();
  const [wordCount, setWordCount] = useState(0);
  const [textNodesKeys, setTextNodesKeys] = useState<NodeKey[]>([]);

  useEffect(() => {
    // Set the intital wordCount state when the plugin is loaded for the first time
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      const initialTextNodesKeys: NodeKey[] = [];
      let initialWordCount = 0;
      for (const child of children) {
        if ($isParagraphNode(child)) {
          const textNodes: TextNode[] = child.getAllTextNodes();
          for (const textNode of textNodes) {
            const text = textNode.getTextContent();
            const wordCountOfTextNode = getWordCountOfTextNode(text);
            initialWordCount += wordCountOfTextNode;
            initialTextNodesKeys.push(textNode.getKey());
          }
        }
      }
      setTextNodesKeys(initialTextNodesKeys);
      setWordCount(initialWordCount);
    });
  }, [editor]);

  return [textNodesKeys, wordCount];
}
