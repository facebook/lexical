/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSlot,
  $withCompactExport,
  createEditor,
  type LexicalEditor,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type SerializedRootNode,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

import {
  $createTestDecoratorNode,
  $createTestShadowRootNode,
  TestDecoratorNode,
  TestShadowRootNode,
} from '../utils';

// The walk only ever produces elements where this is used, but serialized
// JSON carries no discriminator beyond `type`, so the shape is asserted here
// rather than at every call site.
function childrenOf(node: SerializedLexicalNode): SerializedLexicalNode[] {
  return (node as SerializedElementNode).children;
}

describe('compact export', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor({
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
              $createTextNode('bold').setFormat('bold'),
            ),
          );
      },
      {discrete: true},
    );
  });

  function toJSON(compact = false): SerializedRootNode {
    return editor.read(() =>
      $withCompactExport(compact, () => editor.getEditorState().toJSON().root),
    );
  }

  test('legacy is the default and is unchanged', () => {
    const root = toJSON();
    const paragraph = childrenOf(root)[0];
    const [plain, bold] = childrenOf(paragraph);
    // every property written out, including the deprecated `version`
    expect(root.version).toBe(1);
    expect(paragraph).toMatchObject({
      direction: null,
      format: '',
      indent: 0,
      type: 'paragraph',
      version: 1,
    });
    expect(plain).toMatchObject({
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
      text: 'plain',
      type: 'text',
      version: 1,
    });
    expect(bold).toMatchObject({format: 1, text: 'bold'});
  });

  test('compact omits version and every default-valued property', () => {
    const root = toJSON(true);
    const paragraph = childrenOf(root)[0];
    const [plain, bold] = childrenOf(paragraph);
    expect(root).not.toHaveProperty('version');
    // a paragraph with no formatting keeps only its structure
    expect(Object.keys(paragraph).sort()).toEqual(['children', 'type']);
    // text keeps what differs from the default, drops the rest
    expect(plain).toEqual({text: 'plain', type: 'text'});
    expect(bold).toEqual({format: 1, text: 'bold', type: 'text'});
  });

  test('compact JSON parses back to the same document as legacy JSON', () => {
    const legacy = toJSON();
    const compact = toJSON(true);
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(legacy).length,
    );

    const fromCompact = editor.parseEditorState({
      root: compact,
    } as never);
    const fromLegacy = editor.parseEditorState({root: legacy} as never);
    // both restore the same content, and re-exporting the compact-parsed state
    // in legacy form reproduces the original legacy JSON exactly
    for (const state of [fromCompact, fromLegacy]) {
      expect(
        state.read(() =>
          $getRoot()
            .getAllTextNodes()
            .map(n => [n.getTextContent(), n.getFormat()]),
        ),
      ).toEqual([
        ['plain', 0],
        ['bold', 1],
      ]);
    }
    expect(fromCompact.toJSON()).toEqual(fromLegacy.toJSON());
  });

  test('the form does not leak outside its callback', () => {
    toJSON(true);
    expect(childrenOf(toJSON())[0].version).toBe(1);
  });
});

describe('compact export: slot hosts', () => {
  test('a decorator host keeps its slots in both forms', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const host = $createTestDecoratorNode().setIsInline(false);
          const slot = $createTestShadowRootNode();
          slot.append($createParagraphNode().append($createTextNode('inside')));
          $getRoot().clear().append(host);
          $setSlot(host, 'body', slot);
        },
        name: '[serialization-slots]',
        nodes: [TestDecoratorNode, TestShadowRootNode],
      }),
    );
    for (const compact of [false, true]) {
      const root = editor.read(() =>
        $withCompactExport(
          compact,
          () => editor.getEditorState().toJSON().root,
        ),
      );
      // a decorator host has no children array, so its slots are the only
      // subtree it carries
      const host = childrenOf(root)[0];
      expect(host.type).toBe('test_decorator');
      expect(JSON.stringify(host.$slots)).toContain('inside');
    }
  });
});
