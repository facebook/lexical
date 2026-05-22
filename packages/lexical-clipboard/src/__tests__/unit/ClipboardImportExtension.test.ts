/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertDataTransferForRichText,
  $insertGeneratedNodes,
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
  $getEditor,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
} from 'lexical';
import {DataTransferMock} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function $initialEditorState(): void {
  $getRoot().append($createParagraphNode()).select();
}

function dataTransferWithHtml(html: string): DataTransfer {
  const dt = new DataTransferMock();
  dt.setData('text/html', html);
  return dt as unknown as DataTransfer;
}

function $pasteHtml(
  editor: ReturnType<typeof buildEditorFromExtensions>,
  html: string,
) {
  editor.update(
    () => {
      const selection = $getSelection();
      assert($isRangeSelection(selection), 'expected RangeSelection');
      $insertDataTransferForRichText(
        dataTransferWithHtml(html),
        selection,
        editor,
      );
    },
    {discrete: true},
  );
}

describe('ClipboardImportExtension', () => {
  test('default importer handles a basic <p> paste (no extension configured)', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({$initialEditorState, name: 'host'}),
    );
    $pasteHtml(editor, '<p>hello</p>');
    editor.read(() => {
      const lastChild = $getRoot().getLastChild();
      assert($isParagraphNode(lastChild), 'expected paragraph');
      expect(lastChild.getTextContent()).toBe('hello');
    });
  });

  test('a registered text/html handler runs before the default and can stop the chain', () => {
    let called = 0;
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          configExtension(ClipboardImportExtension, {
            $importMimeType: {
              'text/html': [
                (_html, selection) => {
                  called++;
                  const p = $createParagraphNode().append(
                    $createTextNode('[custom]'),
                  );
                  $insertGeneratedNodes($getEditor(), [p], selection);
                  return true;
                },
              ],
            },
          }),
        ],
        name: 'host',
      }),
    );
    $pasteHtml(editor, '<p>ignored</p>');
    editor.read(() => {
      const lastChild = $getRoot().getLastChild();
      assert($isParagraphNode(lastChild), 'expected paragraph');
      expect(lastChild.getTextContent()).toBe('[custom]');
    });
    expect(called).toBe(1);
  });

  test('handler can call next() to defer to the default', () => {
    let deferred = false;
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          configExtension(ClipboardImportExtension, {
            $importMimeType: {
              'text/html': [
                (_html, _selection, next) => {
                  deferred = true;
                  return next();
                },
              ],
            },
          }),
        ],
        name: 'host',
      }),
    );
    $pasteHtml(editor, '<p>hello</p>');
    editor.read(() => {
      const lastChild = $getRoot().getLastChild();
      assert($isParagraphNode(lastChild), 'expected paragraph');
      expect(lastChild.getTextContent()).toBe('hello');
    });
    expect(deferred).toBe(true);
  });

  test('app-defined MIME type is reached when added to both stack and priority', () => {
    let saw = '';
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          configExtension(ClipboardImportExtension, {
            $importMimeType: {
              'application/vnd.myapp+json': [
                (data, selection) => {
                  saw = data;
                  const p = $createParagraphNode().append(
                    $createTextNode(`[${data}]`),
                  );
                  $insertGeneratedNodes($getEditor(), [p], selection);
                  return true;
                },
              ],
            },
            // Slot the custom MIME type between lexical-editor (0) and
            // text/html (10). The other built-in weights inherit from
            // the defaults; we don't need to enumerate them.
            priority: {'application/vnd.myapp+json': 5},
          }),
        ],
        name: 'host',
      }),
    );
    const dt = new DataTransferMock();
    dt.setData('text/html', '<p>html-fallback</p>');
    dt.setData('application/vnd.myapp+json', '{"a":1}');
    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'expected RangeSelection');
        $insertDataTransferForRichText(
          dt as unknown as DataTransfer,
          selection,
          editor,
        );
      },
      {discrete: true},
    );
    expect(saw).toBe('{"a":1}');
    editor.read(() => {
      const lastChild = $getRoot().getLastChild();
      assert($isParagraphNode(lastChild), 'expected paragraph');
      expect(lastChild.getTextContent()).toBe('[{"a":1}]');
    });
  });

  test('priority weights compose without coordination between extensions', () => {
    let myAppCalls = 0;
    let htmlCalls = 0;
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          configExtension(ClipboardImportExtension, {
            $importMimeType: {
              'application/vnd.myapp+json': [
                () => {
                  myAppCalls++;
                  return true;
                },
              ],
              'text/html': [
                (_html, _selection, next) => {
                  htmlCalls++;
                  return next();
                },
              ],
            },
            // myapp gets weight 1 → runs ahead of html (default weight 10).
            priority: {'application/vnd.myapp+json': 1},
          }),
        ],
        name: 'host',
      }),
    );
    const dt = new DataTransferMock();
    dt.setData('text/html', '<p>x</p>');
    dt.setData('application/vnd.myapp+json', '{}');
    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'expected RangeSelection');
        $insertDataTransferForRichText(
          dt as unknown as DataTransfer,
          selection,
          editor,
        );
      },
      {discrete: true},
    );
    expect(myAppCalls).toBe(1);
    expect(htmlCalls).toBe(0);
  });

  test('text/html can be routed through DOMImportExtension', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          CoreImportExtension,
          configExtension(ClipboardImportExtension, {
            $importMimeType: {
              'text/html': [
                (html, selection) => {
                  const parser = new DOMParser();
                  const dom = parser.parseFromString(html, 'text/html');
                  const nodes = $generateNodesFromDOMViaExtension(dom, {
                    context: [contextValue(ImportSource, 'paste')],
                  });
                  $insertGeneratedNodes($getEditor(), nodes, selection);
                  return true;
                },
              ],
            },
          }),
        ],
        name: 'host',
      }),
    );
    $pasteHtml(editor, '<p>via <strong>new</strong> pipeline</p>');
    editor.read(() => {
      const lastChild = $getRoot().getLastChild();
      assert($isParagraphNode(lastChild), 'expected paragraph');
      expect(lastChild.getTextContent()).toBe('via new pipeline');
    });
  });
});
