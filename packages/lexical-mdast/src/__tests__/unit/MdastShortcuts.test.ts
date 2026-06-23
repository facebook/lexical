/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeNode} from '@lexical/code-core';
import {createHeadlessEditor} from '@lexical/headless';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {beforeEach, describe, expect, it} from 'vitest';

import {registerMarkdownShortcuts} from '../../index';

function createEditor(): LexicalEditor {
  const editor = createHeadlessEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
  });
  registerMarkdownShortcuts(editor);
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.selectEnd();
    },
    {discrete: true},
  );
  return editor;
}

/** Types each chunk in its own discrete update, firing the shortcut listener. */
function type(editor: LexicalEditor, chunks: string[]): void {
  for (const chunk of chunks) {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(chunk);
        }
      },
      {discrete: true},
    );
  }
}

describe('@lexical/mdast streaming shortcuts', () => {
  let editor: LexicalEditor;
  beforeEach(() => {
    editor = createEditor();
  });

  function firstChildType(): string {
    return editor.read(() => $getRoot().getFirstChild()!.getType());
  }

  describe('block shortcuts (on space)', () => {
    it('# -> heading', () => {
      type(editor, ['#', ' ']);
      expect(firstChildType()).toBe('heading');
      editor.read(() => {
        expect(($getRoot().getFirstChild() as HeadingNode).getTag()).toBe('h1');
      });
    });

    it('### -> heading level 3', () => {
      type(editor, ['##', '#', ' ']);
      editor.read(() => {
        expect(($getRoot().getFirstChild() as HeadingNode).getTag()).toBe('h3');
      });
    });

    it('> -> quote', () => {
      type(editor, ['>', ' ']);
      expect(firstChildType()).toBe('quote');
    });

    it('- -> bullet list', () => {
      type(editor, ['-', ' ']);
      expect(firstChildType()).toBe('list');
      editor.read(() => {
        expect(($getRoot().getFirstChild() as ListNode).getListType()).toBe(
          'bullet',
        );
      });
    });

    it('1. -> ordered list', () => {
      type(editor, ['1', '.', ' ']);
      editor.read(() => {
        const list = $getRoot().getFirstChild() as ListNode;
        expect(list.getType()).toBe('list');
        expect(list.getListType()).toBe('number');
      });
    });

    it('- [ ] -> check list', () => {
      type(editor, ['-', ' ', '[', ']', ' ']);
      editor.read(() => {
        const list = $getRoot().getFirstChild() as ListNode;
        expect(list.getType()).toBe('list');
        expect(list.getListType()).toBe('check');
      });
    });
  });

  describe('inline shortcuts (on closing delimiter)', () => {
    function inlineFormats(): number[] {
      return editor.read(() => {
        const element = $getRoot().getFirstChild() as ElementNode;
        return element
          .getChildren()
          .map(n => ($isTextNode(n) ? n.getFormat() : 0));
      });
    }

    it('**bold** applies bold', () => {
      type(editor, ['**bold*', '*']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('bold');
      });
      expect(inlineFormats().some(f => f !== 0)).toBe(true);
    });

    it('*italic* applies italic', () => {
      type(editor, ['*italic', '*']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('italic');
      });
      expect(inlineFormats().some(f => f !== 0)).toBe(true);
    });

    it('`code` applies code', () => {
      type(editor, ['`code', '`']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('code');
      });
      expect(inlineFormats().some(f => f !== 0)).toBe(true);
    });

    it('~~strike~~ applies strikethrough', () => {
      type(editor, ['~~strike~', '~']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('strike');
      });
      expect(inlineFormats().some(f => f !== 0)).toBe(true);
    });

    it('[text](url) becomes a link', () => {
      type(editor, ['[lexical](https://lexical.dev', ')']);
      editor.read(() => {
        const element = $getRoot().getFirstChild() as ElementNode;
        const link = element.getChildren().find(n => n.getType() === 'link') as
          | LinkNode
          | undefined;
        expect(link).toBeDefined();
        expect(link!.getURL()).toBe('https://lexical.dev');
        expect(link!.getTextContent()).toBe('lexical');
      });
    });

    it('only fires when the closing delimiter is at the caret', () => {
      // A lone opening delimiter must not transform anything.
      type(editor, ['*not italic']);
      expect(firstChildType()).toBe('paragraph');
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('*not italic');
      });
    });
  });

  describe('fenced code (on Enter)', () => {
    it('```js + Enter -> code block', () => {
      type(editor, ['```js']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      editor.read(() => {
        const code = $getRoot().getFirstChild() as CodeNode;
        expect(code.getType()).toBe('code');
        expect(code.getLanguage()).toBe('js');
      });
    });
  });
});
