/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, RootNode} from 'lexical';
import type {HistoryState} from './DEPRECATED_useLexicalHistory';

import {$getRoot, $getSelection} from 'lexical';
import {$createParagraphNode} from 'lexical/ParagraphNode';
import {useRichTextSetup} from './shared/useRichTextSetup';
import {useLexicalHistory} from './DEPRECATED_useLexicalHistory';

function shouldSelectParagraph(editor: LexicalEditor): boolean {
  const activeElement = document.activeElement;
  return (
    $getSelection() !== null ||
    (activeElement !== null && activeElement === editor.getRootElement())
  );
}

function initParagraph(root: RootNode, editor: LexicalEditor): void {
  const paragraph = $createParagraphNode();
  root.append(paragraph);
  if (shouldSelectParagraph(editor)) {
    paragraph.select();
  }
}

function textInitFn(editor: LexicalEditor): void {
  const root = $getRoot();
  const firstChild = root.getFirstChild();
  if (firstChild === null) {
    initParagraph(root, editor);
  }
}

export default function useLexicalRichText(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
): void {
  useRichTextSetup(editor, textInitFn);
  useLexicalHistory(editor, externalHistoryState);
}
