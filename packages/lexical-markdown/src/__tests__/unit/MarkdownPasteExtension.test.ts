/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeNode} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {
  type MarkdownPasteConfig,
  MarkdownPasteExtension,
} from '@lexical/markdown';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  configExtension,
  defineExtension,
  DROP_COMMAND,
  type ElementNode,
  IS_APPLE,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  PASTE_COMMAND,
} from 'lexical';
import {describe, expect, test} from 'vitest';

const MARKDOWN = [
  '# Heading',
  '',
  'Some **bold** and [a link](https://lexical.dev)',
  '',
  '- one',
  '- two',
  '',
  '> quote',
  '',
  '```js',
  'const x = 1;',
  '```',
].join('\n');

function createEditor(
  config: Partial<MarkdownPasteConfig> = {},
  {withMarkdownPaste = true, withAllNodes = true} = {},
): LexicalEditor {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      dependencies: [
        RichTextExtension,
        ...(withMarkdownPaste
          ? [configExtension(MarkdownPasteExtension, config)]
          : []),
      ],
      name: 'test',
      nodes: withAllNodes ? [CodeNode, LinkNode, ListItemNode, ListNode] : [],
    }),
  );
}

function paste(editor: LexicalEditor, data: Record<string, string>): void {
  const clipboardData = new DataTransfer();
  for (const [type, value] of Object.entries(data)) {
    clipboardData.setData(type, value);
  }
  editor.dispatchCommand(
    PASTE_COMMAND,
    new ClipboardEvent('paste', {clipboardData}),
  );
  // The rich text paste handler imports in an update of its own.
  editor.read(() => {});
}

function pasteAsPlainTextShortcut(editor: LexicalEditor): void {
  editor.dispatchCommand(
    KEY_DOWN_COMMAND,
    new KeyboardEvent('keydown', {
      ctrlKey: !IS_APPLE,
      key: 'V',
      metaKey: IS_APPLE,
      shiftKey: true,
    }),
  );
}

function describeNode(node: LexicalNode): unknown {
  return [node.getType(), node.getTextContent()];
}

function $describeRoot(): unknown[] {
  return $getRoot().getChildren().map(describeNode);
}

function describeAfterPaste(
  editor: LexicalEditor,
  data: Record<string, string>,
): unknown[] {
  paste(editor, data);
  return editor.read($describeRoot);
}

describe('MarkdownPasteExtension', () => {
  test('imports pasted plain-text Markdown', () => {
    const editor = createEditor();
    paste(editor, {'text/plain': MARKDOWN});
    editor.read(() => {
      expect($describeRoot()).toEqual([
        ['heading', 'Heading'],
        ['paragraph', 'Some bold and a link'],
        ['list', 'one\n\ntwo'],
        ['quote', 'quote'],
        ['code', 'const x = 1;'],
      ]);
      const paragraph = $getRoot().getChildAtIndex<ElementNode>(1)!;
      const [, bold, , link] = paragraph.getChildren();
      expect($isTextNode(bold) && bold.hasFormat('bold')).toBe(true);
      expect(bold.getTextContent()).toBe('bold');
      expect(link.getType()).toBe('link');
    });
  });

  test('inserts inline Markdown into the paragraph at the caret', () => {
    const editor = createEditor();
    editor.update(
      () => {
        const paragraph = $getRoot().getFirstChildOrThrow<ElementNode>();
        const text = $createTextNode('before  after');
        paragraph.append(text);
        text.select(7, 7);
      },
      {discrete: true},
    );
    paste(editor, {'text/plain': '**bold**'});
    editor.read(() => {
      const children = $getRoot().getChildren<ElementNode>();
      expect(children.map(describeNode)).toEqual([
        ['paragraph', 'before bold after'],
      ]);
      const bold = children[0]
        .getChildren()
        .find(node => node.getTextContent() === 'bold');
      expect($isTextNode(bold) && bold.hasFormat('bold')).toBe(true);
    });
  });

  test('leaves text without Markdown to the default plain-text paste', () => {
    const text = 'first line\n\tsecond line\n\nthird line';
    const expected = describeAfterPaste(
      createEditor({}, {withMarkdownPaste: false}),
      {'text/plain': text},
    );
    expect(describeAfterPaste(createEditor(), {'text/plain': text})).toEqual(
      expected,
    );
    // The default handler keeps the format at the caret.
    const editor = createEditor();
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.formatText('italic');
        }
      },
      {discrete: true},
    );
    paste(editor, {'text/plain': 'plain words'});
    editor.read(() => {
      const [pasted] = $getRoot()
        .getFirstChildOrThrow<ElementNode>()
        .getChildren();
      expect(pasted.getTextContent()).toBe('plain words');
      expect($isTextNode(pasted) && pasted.hasFormat('italic')).toBe(true);
    });
  });

  test('imports text whose only Markdown is an escape', () => {
    const editor = createEditor();
    expect(
      describeAfterPaste(editor, {'text/plain': '\\*not bold\\*'}),
    ).toEqual([['paragraph', '*not bold*']]);
  });

  test('HTML on the clipboard takes priority over plain text', () => {
    const editor = createEditor();
    expect(
      describeAfterPaste(editor, {
        'text/html': '<p>from html</p>',
        'text/plain': '# from plain text',
      }),
    ).toEqual([['paragraph', 'from html']]);
  });

  test('pastes literally inside a code block', () => {
    const editor = createEditor();
    editor.update(
      () => {
        const code = $createCodeNode();
        $getRoot().clear().append(code);
        code.selectEnd();
      },
      {discrete: true},
    );
    expect(
      describeAfterPaste(editor, {'text/plain': '# not a heading'}),
    ).toEqual([['code', '# not a heading']]);
  });

  test('pastes literally with the paste-as-plain-text shortcut', () => {
    const editor = createEditor();
    pasteAsPlainTextShortcut(editor);
    expect(describeAfterPaste(editor, {'text/plain': '# literal'})).toEqual([
      ['paragraph', '# literal'],
    ]);
    // The shortcut applies only to the paste it triggered.
    editor.update(() => $getRoot().clear().append($createParagraphNode()), {
      discrete: true,
    });
    editor.update(() => $getRoot().selectEnd(), {discrete: true});
    expect(describeAfterPaste(editor, {'text/plain': '# heading'})).toEqual([
      ['heading', 'heading'],
    ]);
  });

  test('a key pressed after the shortcut cancels it', () => {
    const editor = createEditor();
    pasteAsPlainTextShortcut(editor);
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      new KeyboardEvent('keydown', {key: 'a'}),
    );
    expect(describeAfterPaste(editor, {'text/plain': '# heading'})).toEqual([
      ['heading', 'heading'],
    ]);
  });

  test('a drop is never a plain-text paste', () => {
    const editor = createEditor();
    const {pasteAsPlainText} = getExtensionDependencyFromEditor(
      editor,
      MarkdownPasteExtension,
    ).output;
    pasteAsPlainTextShortcut(editor);
    paste(editor, {'text/plain': 'x'});
    expect(pasteAsPlainText.peek()).toBe(true);
    editor.dispatchCommand(DROP_COMMAND, new DragEvent('drop'));
    expect(pasteAsPlainText.peek()).toBe(false);
  });

  test('pastes literally when disabled', () => {
    const editor = createEditor({disabled: true});
    expect(describeAfterPaste(editor, {'text/plain': '# literal'})).toEqual([
      ['paragraph', '# literal'],
    ]);
  });

  test('$shouldImport can decline a paste', () => {
    const editor = createEditor({
      $shouldImport: markdown => !markdown.startsWith('#'),
    });
    expect(describeAfterPaste(editor, {'text/plain': '# literal'})).toEqual([
      ['paragraph', '# literal'],
    ]);
  });

  test('skips transformers whose nodes are not registered', () => {
    const editor = createEditor({}, {withAllNodes: false});
    expect(
      describeAfterPaste(editor, {'text/plain': '# heading\n\n- item'}),
    ).toEqual([
      ['heading', 'heading'],
      ['paragraph', '- item'],
    ]);
  });
});
