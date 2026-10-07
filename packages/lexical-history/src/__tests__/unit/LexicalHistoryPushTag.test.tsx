/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  ElementNode,
  HISTORY_PUSH_TAG,
  type NodeKey,
  type SerializedElementNode,
  UNDO_COMMAND,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

// An inline element node that carries no text of its own. Inserting one right
// after a TextNode only rewrites that TextNode's sibling pointer, so the
// TextNode stays the update's only dirty leaf while its content is unchanged.
class InlineEmptyElementNode extends ElementNode {
  constructor(key?: NodeKey) {
    super(key);
  }

  static getType(): string {
    return 'inline-empty';
  }

  static clone(node: InlineEmptyElementNode): InlineEmptyElementNode {
    return new InlineEmptyElementNode(node.__key);
  }

  static importJSON(): InlineEmptyElementNode {
    return new InlineEmptyElementNode();
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return true;
  }

  exportJSON(): SerializedElementNode {
    return {
      ...super.exportJSON(),
      type: 'inline-empty',
    };
  }
}

function $createInlineEmptyElementNode(): InlineEmptyElementNode {
  return new InlineEmptyElementNode();
}

describe('LexicalHistory HISTORY_PUSH_TAG tests', () => {
  test('HISTORY_PUSH_TAG pushes a new entry when the only dirty leaf is an unchanged TextNode (#9217)', async () => {
    const editor = createTestEditor({nodes: [InlineEmptyElementNode]});
    const historyState = createEmptyHistoryState();
    registerHistory(editor, historyState, 1000);

    // Establish a first undo entry: add an empty paragraph, then type
    // into it. (A single update straight from the empty initial state does not
    // create an entry, matching the report in #9217.)
    await editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    await editor.update(
      () => {
        ($getRoot().getFirstChild() as ElementNode).append(
          $createTextNode('ab'),
        );
      },
      {discrete: true},
    );
    expect(historyState.undoStack).toHaveLength(1);

    // Insert an element-only node directly after the text node, explicitly
    // requesting its own undo entry via HISTORY_PUSH_TAG. The text node's
    // sibling pointer changes (making it the update's only dirty leaf) but its
    // content is unchanged, so the tag must still create a new entry.
    await editor.update(
      () => {
        const paragraph = $getRoot().getFirstChild() as ElementNode;
        const textNode = paragraph.getFirstChild()!;
        textNode.insertAfter($createInlineEmptyElementNode());
      },
      {discrete: true, tag: HISTORY_PUSH_TAG},
    );
    expect(historyState.undoStack).toHaveLength(2);

    // A single undo removes only the inserted element, leaving the text.
    await editor.update(
      () => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      },
      {discrete: true},
    );
    editor.getEditorState().read(() => {
      const children = (
        $getRoot().getFirstChild() as ElementNode
      ).getChildren();
      expect(children.map(node => node.getType())).toEqual(['text']);
    });
  });
});
