/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {$isLinkNode} from '@lexical/link';
import {$isListItemNode, $isListNode} from '@lexical/list';
import {$isHeadingNode, $isQuoteNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $getState,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {
  MdastCommonMarkExtension,
  MdastGfmExtension,
  MdastShortcutsExtension,
} from '../../index';
import {codeFenceState, codeMetaState} from '../../state';

function createEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        MdastGfmExtension,
        MdastShortcutsExtension,
      ],
      name: '[root]',
    }),
  );
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
  /** Asserts the root's first child matches the guard, inside a read. */
  function $expectFirstChild<T extends LexicalNode>(
    editor: LexicalEditor,
    $guard: (value: LexicalNode | null) => value is T,
  ): void {
    editor.read(() => {
      $assertNodeType($getRoot().getFirstChild(), $guard);
    });
  }

  describe('block shortcuts (on space)', () => {
    it('# -> heading', () => {
      using editor = createEditor();
      type(editor, ['#', ' ']);
      editor.read(() => {
        const heading = $assertNodeType(
          $getRoot().getFirstChild(),
          $isHeadingNode,
        );
        expect(heading.getTag()).toBe('h1');
      });
    });

    it('### -> heading level 3', () => {
      using editor = createEditor();
      type(editor, ['##', '#', ' ']);
      editor.read(() => {
        const heading = $assertNodeType(
          $getRoot().getFirstChild(),
          $isHeadingNode,
        );
        expect(heading.getTag()).toBe('h3');
      });
    });

    it('> -> quote', () => {
      using editor = createEditor();
      type(editor, ['>', ' ']);
      $expectFirstChild(editor, $isQuoteNode);
    });

    it('- -> bullet list', () => {
      using editor = createEditor();
      type(editor, ['-', ' ']);
      editor.read(() => {
        const list = $assertNodeType($getRoot().getFirstChild(), $isListNode);
        expect(list.getListType()).toBe('bullet');
      });
    });

    it('1. -> ordered list', () => {
      using editor = createEditor();
      type(editor, ['1', '.', ' ']);
      editor.read(() => {
        const list = $assertNodeType($getRoot().getFirstChild(), $isListNode);
        expect(list.getListType()).toBe('number');
      });
    });

    it('- [ ] -> check list', () => {
      using editor = createEditor();
      type(editor, ['-', ' ', '[', ' ', ']', ' ']);
      editor.read(() => {
        const list = $assertNodeType($getRoot().getFirstChild(), $isListNode);
        expect(list.getListType()).toBe('check');
      });
    });

    it('- [x] -> checked check list item', () => {
      using editor = createEditor();
      type(editor, ['-', ' ', '[', 'x', ']', ' ']);
      editor.read(() => {
        const list = $assertNodeType($getRoot().getFirstChild(), $isListNode);
        expect(list.getListType()).toBe('check');
        const item = list.getFirstChild();
        expect($isListItemNode(item) && item.getChecked()).toBe(true);
      });
    });

    it('- [] does not become a check list (GFM requires one character)', () => {
      using editor = createEditor();
      type(editor, ['-', ' ', '[', ']', ' ']);
      editor.read(() => {
        const list = $assertNodeType($getRoot().getFirstChild(), $isListNode);
        expect(list.getListType()).toBe('bullet');
      });
    });
  });

  describe('inline shortcuts (on closing delimiter)', () => {
    function inlineFormats(editor: LexicalEditor): number[] {
      return editor.read(() => {
        const element = $assertNodeType(
          $getRoot().getFirstChild(),
          $isElementNode,
        );
        return element
          .getChildren()
          .map(n => ($isTextNode(n) ? n.getFormat() : 0));
      });
    }

    it('**bold** applies bold', () => {
      using editor = createEditor();
      type(editor, ['**bold*', '*']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('bold');
      });
      expect(inlineFormats(editor).some(f => f !== 0)).toBe(true);
    });

    it('*italic* applies italic', () => {
      using editor = createEditor();
      type(editor, ['*italic', '*']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('italic');
      });
      expect(inlineFormats(editor).some(f => f !== 0)).toBe(true);
    });

    it('`code` applies code', () => {
      using editor = createEditor();
      type(editor, ['`code', '`']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('code');
      });
      expect(inlineFormats(editor).some(f => f !== 0)).toBe(true);
    });

    it('~~strike~~ applies strikethrough', () => {
      using editor = createEditor();
      type(editor, ['~~strike~', '~']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('strike');
      });
      expect(inlineFormats(editor).some(f => f !== 0)).toBe(true);
    });

    it('[text](url) becomes a link', () => {
      using editor = createEditor();
      type(editor, ['[lexical](https://lexical.dev', ')']);
      editor.read(() => {
        const element = $assertNodeType(
          $getRoot().getFirstChild(),
          $isElementNode,
        );
        const link = element.getChildren().find($isLinkNode);
        expect(link).toBeDefined();
        expect(link!.getURL()).toBe('https://lexical.dev');
        expect(link!.getTextContent()).toBe('lexical');
      });
    });

    it('only fires when the closing delimiter is at the caret', () => {
      using editor = createEditor();
      // A lone opening delimiter must not transform anything.
      type(editor, ['*not italic']);
      $expectFirstChild(editor, $isParagraphNode);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('*not italic');
      });
    });
  });

  describe('fenced code (on Enter)', () => {
    it('```js + Enter -> empty code block with the language', () => {
      using editor = createEditor();
      type(editor, ['```js']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      editor.read(() => {
        const code = $assertNodeType($getRoot().getFirstChild(), $isCodeNode);
        expect(code.getLanguage()).toBe('js');
        // The fence line is entirely marker; no literal '```js' may leak in.
        expect(code.getTextContent()).toBe('');
      });
    });

    it('```js title=x + Enter keeps the info-string meta and fence', () => {
      using editor = createEditor();
      type(editor, ['~~~js title=x']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      editor.read(() => {
        const code = $assertNodeType($getRoot().getFirstChild(), $isCodeNode);
        expect(code.getLanguage()).toBe('js');
        expect($getState(code, codeMetaState)).toBe('title=x');
        expect($getState(code, codeFenceState)).toBe('~~~');
      });
    });
  });

  describe('does not fire destructively', () => {
    it('Enter does not convert a line with content after the marker', () => {
      using editor = createEditor();
      // '# Title' inserted in one operation (paste-like), then Enter. The
      // heading shortcut already had its chance at the space; Enter on a
      // line with content must not re-convert it (undo-escape hatch).
      type(editor, ['# Title']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      $expectFirstChild(editor, $isParagraphNode);
      editor.read(() => {
        expect($getRoot().getTextContent()).toContain('# Title');
      });
    });

    it('Enter does not convert prose that happens to parse as a list', () => {
      using editor = createEditor();
      type(editor, ['2024. was a big year']);
      editor.dispatchCommand(KEY_ENTER_COMMAND, null);
      $expectFirstChild(editor, $isParagraphNode);
    });

    it('multi-character insertion (paste) does not transform', () => {
      using editor = createEditor();
      type(editor, ['see *note*']);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('see *note*');
      });
    });

    it('deleting back to a delimiter does not transform', () => {
      using editor = createEditor();
      type(editor, ['*a*b']);
      // Simulate backspace: the trailing character is removed and the caret
      // lands right after the closing '*'.
      editor.update(
        () => {
          const paragraph = $assertNodeType(
            $getRoot().getFirstChild(),
            $isElementNode,
          );
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
      using editor = createEditor();
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
        const paragraph = $assertNodeType(
          $getRoot().getFirstChild(),
          $isElementNode,
        );
        const first = paragraph.getFirstChild();
        expect($isTextNode(first) && first.hasFormat('code')).toBe(true);
      });
    });

    it('block markers wrapped in inline formatting keep their delimiters', () => {
      using editor = createEditor();
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
