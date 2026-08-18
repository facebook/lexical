/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTextNode,
  $withSerializationContext,
  createEditor,
  type LexicalEditor,
  SerializationContextCompact,
  SerializationContextNodeTransforms,
  type SerializedLexicalNode,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

type SerializedJSON = Record<string, unknown> & {
  children?: SerializedJSON[];
};

describe('serialization context', () => {
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

  function toJSON(
    pairs: Parameters<typeof $withSerializationContext>[0] = [],
  ): SerializedJSON {
    return editor.read(
      () =>
        $withSerializationContext(pairs)(
          () => editor.getEditorState().toJSON().root,
        ) as unknown as SerializedJSON,
    );
  }

  test('legacy is the default and is unchanged', () => {
    const root = toJSON();
    const paragraph = root.children![0];
    const [plain, bold] = paragraph.children!;
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
    const root = toJSON([[SerializationContextCompact, true]]);
    const paragraph = root.children![0];
    const [plain, bold] = paragraph.children!;
    expect(root).not.toHaveProperty('version');
    // a paragraph with no formatting keeps only its structure
    expect(Object.keys(paragraph).sort()).toEqual(['children', 'type']);
    // text keeps what differs from the default, drops the rest
    expect(plain).toEqual({text: 'plain', type: 'text'});
    expect(bold).toEqual({format: 1, text: 'bold', type: 'text'});
  });

  test('compact JSON parses back to the same document as legacy JSON', () => {
    const legacy = toJSON();
    const compact = toJSON([[SerializationContextCompact, true]]);
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

  test('a node transform can omit a node and its subtree', () => {
    const root = toJSON([
      [
        SerializationContextNodeTransforms,
        [
          (node: import('lexical').LexicalNode, json: SerializedLexicalNode) =>
            $isTextNode(node) && node.getTextContent() === 'bold' ? null : json,
        ],
      ],
    ]);
    const paragraph = root.children![0];
    expect(paragraph.children!.map(child => child.text)).toEqual(['plain']);
  });

  test('a node transform can replace a node', () => {
    const root = toJSON([
      [
        SerializationContextNodeTransforms,
        [
          (node: import('lexical').LexicalNode, json: SerializedLexicalNode) =>
            $isTextNode(node) && node.getTextContent() === 'bold'
              ? {...json, text: 'REDACTED'}
              : json,
        ],
      ],
    ]);
    const paragraph = root.children![0];
    expect(paragraph.children!.map(child => child.text)).toEqual([
      'plain',
      'REDACTED',
    ]);
  });

  test('transforms and compaction compose, and the root is never omitted', () => {
    const root = toJSON([
      [SerializationContextCompact, true],
      [
        SerializationContextNodeTransforms,
        [() => null as SerializedLexicalNode | null],
      ],
    ]);
    // the transform omitted everything below it, but the root survives
    expect(root.type).toBe('root');
    expect(root).not.toHaveProperty('version');
    expect(root.children).toEqual([]);
  });

  test('the context does not leak outside its callback', () => {
    toJSON([[SerializationContextCompact, true]]);
    expect(toJSON().children![0].version).toBe(1);
  });
});
