/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import {
  $handleListInsertParagraph,
  $isListItemNode,
  indentList,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  insertList,
  outdentList,
  REMOVE_LIST_COMMAND,
  removeList,
} from '@lexical/list';
import {mergeRegister} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

export default function useList(editor: LexicalEditor): void {
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        INDENT_CONTENT_COMMAND,
        () => {
          indentList();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        OUTDENT_CONTENT_COMMAND,
        () => {
          outdentList();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_ORDERED_LIST_COMMAND,
        () => {
          insertList(editor, 'number');
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_UNORDERED_LIST_COMMAND,
        () => {
          insertList(editor, 'bullet');
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_CHECK_LIST_COMMAND,
        () => {
          insertList(editor, 'check');
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        REMOVE_LIST_COMMAND,
        () => {
          removeList(editor);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const hasHandledInsertParagraph = $handleListInsertParagraph();
          if (hasHandledInsertParagraph) {
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      listenPointerDown(),
    );
  }, [editor]);
}

let listenersCount = 0;

function listenPointerDown() {
  if (listenersCount++ === 0) {
    // $FlowFixMe[speculation-ambiguous]
    document.addEventListener('pointerdown', handlePointerDown);
  }

  return () => {
    if (--listenersCount === 0) {
      // $FlowFixMe[speculation-ambiguous]
      document.removeEventListener('pointerdown', handlePointerDown);
    }
  };
}

function findEditor(target) {
  let node = target;
  while (node) {
    if (node.__lexicalEditor) {
      return (node.__lexicalEditor: LexicalEditor);
    }
    node = node.parentNode;
  }
  return null;
}

function handlePointerDown(event) {
  const target = event.target;
  const parentNode = target.parentNode;
  if (!parentNode || parentNode.__lexicalListType !== 'check') {
    return;
  }

  const pageX = event.pageX;
  const rect = target.getBoundingClientRect();
  if (pageX > rect.left && pageX < rect.left + 20) {
    const editor = findEditor(target);
    if (editor != null) {
      editor.update(() => {
        const node = $getNearestNodeFromDOMNode(target);
        if ($isListItemNode(node)) {
          node.toggleChecked();
        }
      });
      event.preventDefault();
    }
  }
}
