/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CommandListenerEditorPriority,
  LexicalEditor,
  RootNode,
} from 'lexical';

import {$createParagraphNode, $getRoot, $getSelection, $log} from 'lexical';
import {useLayoutEffect} from 'react';

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

function initEditor(editor: LexicalEditor): void {
  editor.update(() => {
    $log('initEditor');
    const root = $getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild === null) {
      initParagraph(root, editor);
    }
  });
}

function clearEditor(
  editor: LexicalEditor,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update(
    () => {
      $log('clearEditor');
      const root = $getRoot();
      root.clear();
      initParagraph(root, editor);
    },
    {
      onUpdate: callbackFn,
    },
  );
}

export default function DEPRECATED__useMLCLexicalBootstrap(
  editor: LexicalEditor,
) {
  useLayoutEffect(() => {
    return editor.addListener(
      'command',
      (type) => {
        if (type === 'bootstrapEditor') {
          initEditor(editor);
          return true;
        } else if (type === 'clearEditor') {
          clearEditor(editor);
          return true;
        }
        return false;
      },
      (0: CommandListenerEditorPriority),
    );
  });
}
