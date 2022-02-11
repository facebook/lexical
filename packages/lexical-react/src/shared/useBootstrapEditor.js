/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  CommandListenerEditorPriority,
  LexicalEditor,
  RootNode,
} from 'lexical';

import {$createParagraphNode, $getRoot, $getSelection, $log} from 'lexical';
import useLayoutEffect from 'shared/useLayoutEffect';

const BootstrapPriority: CommandListenerEditorPriority = 0;

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

function defaultInitEditor(editor: LexicalEditor): void {
  const root = $getRoot();
  const firstChild = root.getFirstChild();
  if (firstChild === null) {
    initParagraph(root, editor);
  }
}

function defaultClearEditor(editor: LexicalEditor): void {
  const root = $getRoot();
  root.clear();
  initParagraph(root, editor);
}

function initEditor(
  editor: LexicalEditor,
  initialPayloadFn: (LexicalEditor) => void,
): void {
  editor.update(() => {
    $log('initEditor');
    initialPayloadFn(editor);
  });
}

function clearEditor(
  editor: LexicalEditor,
  clearEditorFn: (LexicalEditor) => void,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update(
    () => {
      $log('clearEditor');
      clearEditorFn(editor);
    },
    {
      onUpdate: callbackFn,
    },
  );
}

export default function useBootstrapEditor(
  editor: LexicalEditor,
  initialPayloadFn?: (LexicalEditor) => void,
  clearEditorFn?: (LexicalEditor) => void,
): void {
  useLayoutEffect(() => {
    return editor.addListener(
      'command',
      (type, payload): boolean => {
        if (type === 'bootstrapEditor') {
          initEditor(
            editor,
            initialPayloadFn != null ? initialPayloadFn : defaultInitEditor,
          );
          return false;
        }
        if (type === 'clearEditor') {
          clearEditor(
            editor,
            clearEditorFn != null ? clearEditorFn : defaultClearEditor,
          );
          return false;
        }
        return false;
      },
      BootstrapPriority,
    );
  }, [clearEditorFn, editor, initialPayloadFn]);
}
