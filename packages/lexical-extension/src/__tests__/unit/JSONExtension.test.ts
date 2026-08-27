/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  configExtension,
  getExtensionDependencyFromEditor,
  type JSONConfig,
  JSONExtension,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type SerializedElementNode,
  type SerializedRootNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function buildEditor(
  config: Partial<JSONConfig> = {},
): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions({
    dependencies: [configExtension(JSONExtension, config)],
    name: '[root]',
    namespace: '',
    onError: err => {
      throw err;
    },
  });
  editor.update(
    () => {
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append(
            $createTextNode('plain'),
            // a distinct format keeps this from normalizing into its sibling
            $createTextNode('secret').setFormat('bold'),
          ),
        );
    },
    {discrete: true},
  );
  return editor;
}

function exportRoot(
  editor: LexicalEditorWithDispose,
  options?: {compact?: boolean},
): SerializedRootNode {
  const {$exportJSON} = getExtensionDependencyFromEditor(
    editor,
    JSONExtension,
  ).output;
  // $exportJSON is typed as the shape both forms satisfy, since the form is
  // the extension's configuration rather than this call's. Every case here
  // knows which form it asked for, so the assertion is made once.
  return editor.read(
    () => $exportJSON(undefined, options).root,
  ) as SerializedRootNode;
}

// The walk only ever produces elements where these are used, but serialized
// JSON carries no discriminator beyond `type`, so the shape is asserted here
// rather than at every call site.
describe('JSONExtension', () => {
  test('defaults to the legacy form', () => {
    using editor = buildEditor();
    const root = exportRoot(editor);
    expect(root.version).toBe(1);
    expect(root.children[0]).toMatchObject({indent: 0, type: 'paragraph'});
  });

  test('config `compact` drops version and default-valued properties', () => {
    using editor = buildEditor({compact: true});
    const root = exportRoot(editor);
    expect(root).not.toHaveProperty('version');
    expect(Object.keys(root.children[0]).sort()).toEqual(['children', 'type']);
  });

  test('the per-call option wins over the configured default', () => {
    using compactEditor = buildEditor({compact: true});
    expect(exportRoot(compactEditor, {compact: false}).version).toBe(1);
    using legacyEditor = buildEditor();
    expect(exportRoot(legacyEditor, {compact: true})).not.toHaveProperty(
      'version',
    );
  });

  test('compaction drops a property the parser derives rather than reads', () => {
    // ListNode's `tag` follows from `listType` on the way in (it declares
    // {setter: null}), so writing it in the compact form costs bytes nothing
    // will ever read.
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(JSONExtension, {compact: true}),
        ListExtension,
      ],
      name: '[root]',
      namespace: '',
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createListNode('bullet').append($createListItemNode()));
      },
      {discrete: true},
    );
    const {$exportJSON} = getExtensionDependencyFromEditor(
      editor,
      JSONExtension,
    ).output;
    const list = editor.read(
      () =>
        ($exportJSON().root as unknown as SerializedElementNode)
          .children[0] as unknown as Record<string, unknown>,
    );
    expect(list).toMatchObject({listType: 'bullet', type: 'list'});
    expect('tag' in list).toBe(false);
    // the legacy form still writes it, as it always has
    const legacy = editor.read(
      () =>
        (
          $exportJSON(undefined, {compact: false})
            .root as unknown as SerializedElementNode
        ).children[0] as unknown as Record<string, unknown>,
    );
    expect(legacy).toMatchObject({tag: 'ul'});
  });
});
