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

import {$getRoot, $getSelection, $createParagraphNode} from 'lexical';
import usePlainTextSetup from './shared/usePlainTextSetup';
import {useLexicalHistory} from './DEPRECATED_useLexicalHistory';
import useBootstrapEditor from './shared/useBootstrapEditor';

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

function clearEditor(editor: LexicalEditor): void {
  const root = $getRoot();
  root.clear();
  initParagraph(root, editor);
}

export default function useLexicalPlainText(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
): void {
  useBootstrapEditor(editor, textInitFn, clearEditor);
  usePlainTextSetup(editor);
  useLexicalHistory(editor, externalHistoryState);
}
