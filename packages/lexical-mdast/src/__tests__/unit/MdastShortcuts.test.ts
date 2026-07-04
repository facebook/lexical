/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeNode} from '@lexical/code-core';
import type {LinkNode} from '@lexical/link';
import type {ListNode} from '@lexical/list';
import type {HeadingNode} from '@lexical/rich-text';

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
  type ElementNode,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {beforeEach, describe, expect, it, onTestFinished} from 'vitest';

import {MdastShortcutsExtension} from '../../index';

function createEditor(): LexicalEditor {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [MdastShortcutsExtension],
      name: '[root]',
    }),
  );
  onTestFinished(() => editor.dispose());
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
    it('```js + Enter -> empty code block with the language', () => {
      type(editor, ['```js']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      editor.read(() => {
        const code = $getRoot().getFirstChild() as CodeNode;
        expect(code.getType()).toBe('code');
        expect(code.getLanguage()).toBe('js');
        // The fence line is entirely marker; no literal '```js' may leak in.
        expect(code.getTextContent()).toBe('');
      });
    });
  });

  describe('does not fire destructively', () => {
    it('Enter does not convert a line with content after the marker', () => {
      // '# Title' inserted in one operation (paste-like), then Enter. The
      // heading shortcut already had its chance at the space; Enter on a
      // line with content must not re-convert it (undo-escape hatch).
      type(editor, ['# Title']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      editor.read(() => {
        expect($getRoot().getFirstChild()!.getType()).toBe('paragraph');
        expect($getRoot().getTextContent()).toContain('# Title');
      });
    });

    it('Enter does not convert prose that happens to parse as a list', () => {
      type(editor, ['2024. was a big year']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      editor.read(() => {
        expect($getRoot().getFirstChild()!.getType()).toBe('paragraph');
      });
    });

    it('multi-character insertion (paste) does not transform', () => {
      type(editor, ['see *note*']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('see *note*');
      });
    });

    it('deleting back to a delimiter does not transform', () => {
      type(editor, ['*a*b']);
      // Simulate backspace: the trailing character is removed and the caret
      // lands right after the closing '*'.
      editor.update(
        () => {
          const paragraph = $getRoot().getFirstChild() as ElementNode;
          const text = paragraph.getFirstChild();
          if ($isTextNode(text)) {
            text.setTextContent('*a*');
            text.select(3, 3);
          }
        },
        {discrete: true},
      );
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('*a*');
      });
    });

    it('does not transform inside an inline code span', () => {
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const text = $createTextNode('use *args');
          text.setFormat('code');
          paragraph.append(text);
          $getRoot().clear().append(paragraph);
          text.selectEnd();
        },
        {discrete: true},
      );
      type(editor, ['*']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('use *args*');
        const paragraph = $getRoot().getFirstChild() as ElementNode;
        const first = paragraph.getFirstChild();
        expect($isTextNode(first) && first.hasFormat('code')).toBe(true);
      });
    });

    it('block markers wrapped in inline formatting keep their delimiters', () => {
      // '# **bold** title' + space typed after '#' converts to a heading; the
      // heading itself is exercised elsewhere. Here: pasting the full line
      // and pressing Enter must not strip the '**'.
      type(editor, ['# **bold** title']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      editor.read(() => {
        expect($getRoot().getTextContent()).toContain('**bold** title');
      });
    });
  });
});
