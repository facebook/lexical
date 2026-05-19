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
                (_html, selection, e) => {
                  called++;
                  const p = $createParagraphNode().append(
                    $createTextNode('[custom]'),
                  );
                  $insertGeneratedNodes(e, [p], selection);
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
                (_html, _selection, _editor, next) => {
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

  test('text/html can be routed through DOMImportExtension', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState,
        dependencies: [
          CoreImportExtension,
          configExtension(ClipboardImportExtension, {
            $importMimeType: {
              'text/html': [
                (html, selection, e) => {
                  const parser = new DOMParser();
                  const dom = parser.parseFromString(html, 'text/html');
                  const nodes = $generateNodesFromDOMViaExtension(e, dom, {
                    context: [contextValue(ImportSource, 'paste')],
                  });
                  $insertGeneratedNodes(e, nodes, selection);
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
