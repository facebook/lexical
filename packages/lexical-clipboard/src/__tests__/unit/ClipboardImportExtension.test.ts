/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertDataTransferForRichText,
  ClipboardImportExtension,
} from '@lexical/clipboard';
import {
  buildEditorFromExtensions,
  configExtension,
  defineExtension,
} from '@lexical/extension';
import {
  $generateNodesFromDOMViaExtension,
  contextValue,
  CoreImportExtension,
  ImportSource,
} from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type LexicalEditor,
} from 'lexical';
import {DataTransferMock} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

function $initialEditorState(): void {
  const text = $createTextNode('');
  $getRoot().append($createParagraphNode().append(text));
  text.select(0, 0);
}

function dataTransferWithHtml(html: string): DataTransfer {
  const dt = new DataTransferMock();
  dt.setData('text/html', html);
  return dt as unknown as DataTransfer;
}

describe('ClipboardImportExtension', () => {
  test('default importer matches legacy behavior (no extension configured)', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        name: 'host',
      }),
    );
    editor.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $insertDataTransferForRichText(
          dataTransferWithHtml('<p>hello</p>'),
          selection,
          editor,
        );
      },
      {discrete: true},
    );
    editor.read(() => {
      const root = $getRoot();
      const para = root.getFirstChild();
      expect($isParagraphNode(para)).toBe(true);
      expect(para?.getTextContent()).toBe('hello');
    });
  });

  test('configured importer overrides the default', () => {
    let importerCalled = false;
    const buildEditor = (editor: LexicalEditor) => editor;

    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          configExtension(ClipboardImportExtension, {
            $generateNodesFromDOM: (_editor, _dom) => {
              importerCalled = true;
              // Custom replacement: return a single paragraph with a marker.
              const p = $createParagraphNode();
              p.append($createTextNode('[custom-importer]'));
              return [p];
            },
          }),
        ],
        name: 'host',
      }),
    );
    buildEditor(editor);
    editor.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $insertDataTransferForRichText(
          dataTransferWithHtml('<p>ignored</p>'),
          selection,
          editor,
        );
      },
      {discrete: true},
    );
    editor.read(() => {
      const root = $getRoot();
      const para = root.getFirstChild();
      expect(para?.getTextContent()).toBe('[custom-importer]');
    });
    expect(importerCalled).toBe(true);
  });

  test('clipboard can be routed through DOMImportExtension via $generateNodesFromDOMViaExtension', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          CoreImportExtension,
          configExtension(ClipboardImportExtension, {
            $generateNodesFromDOM: (e, dom) =>
              $generateNodesFromDOMViaExtension(e, dom, {
                context: [contextValue(ImportSource, 'paste')],
              }),
          }),
        ],
        name: 'host',
      }),
    );
    editor.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $insertDataTransferForRichText(
          dataTransferWithHtml('<p>via <strong>new</strong> pipeline</p>'),
          selection,
          editor,
        );
      },
      {discrete: true},
    );
    editor.read(() => {
      const root = $getRoot();
      const text = root.getTextContent();
      expect(text).toContain('via');
      expect(text).toContain('new');
      expect(text).toContain('pipeline');
    });
  });
});
