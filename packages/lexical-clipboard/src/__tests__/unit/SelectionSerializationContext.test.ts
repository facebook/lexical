/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateJSONFromSelectedNodes} from '@lexical/clipboard';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isTextNode,
  $selectAll,
  $withSerializationContext,
  type LexicalNode,
  SerializationContextCompact,
  SerializationContextOverride,
  type SerializedLexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

const extension = defineExtension({
  $initialEditorState: () => {
    $getRoot()
      .clear()
      .append(
        $createParagraphNode().append(
          $createTextNode('plain'),
          $createTextNode('secret').setFormat('bold'),
        ),
      );
  },
  dependencies: [RichTextExtension],
  name: '[selection-serialization]',
});

type SerializedJSON = Record<string, unknown> & {children?: SerializedJSON[]};

function selectionJSON(
  pairs: Parameters<typeof $withSerializationContext>[0] = [],
): SerializedJSON[] {
  using editor = buildEditorFromExtensions({
    dependencies: [extension],
    name: '[root]',
    namespace: '',
    onError: err => {
      throw err;
    },
  });
  let nodes: SerializedJSON[] = [];
  editor.update(
    () => {
      $selectAll();
      nodes = $withSerializationContext(pairs)(
        () =>
          $generateJSONFromSelectedNodes(editor, $getSelection())
            .nodes as unknown as SerializedJSON[],
      );
    },
    {discrete: true},
  );
  return nodes;
}

// A RangeSelection over a paragraph's contents yields its text nodes at the
// top level of the payload, with no paragraph wrapper.
function texts(nodes: SerializedJSON[]): unknown[] {
  return nodes.map(node => node.text);
}

describe('selection export honors the serialization context', () => {
  test('legacy is the default', () => {
    const [plain] = selectionJSON();
    expect(plain).toMatchObject({
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
      text: 'plain',
      type: 'text',
      version: 1,
    });
  });

  test('compact applies to a selection export too', () => {
    const nodes = selectionJSON([[SerializationContextCompact, true]]);
    expect(nodes).toEqual([
      {text: 'plain', type: 'text'},
      {format: 1, text: 'secret', type: 'text'},
    ]);
  });

  test('an override can omit nodes from a selection export', () => {
    const nodes = selectionJSON([
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          $isTextNode(node) && node.getTextContent() === 'secret'
            ? null
            : $next(),
      ],
    ]);
    expect(texts(nodes)).toEqual(['plain']);
  });

  test('an override can replace nodes in a selection export', () => {
    const nodes = selectionJSON([
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) => {
          const json = $next();
          return $isTextNode(node) && node.getTextContent() === 'secret'
            ? {...json, text: 'REDACTED'}
            : json;
        },
      ],
    ]);
    expect(texts(nodes)).toEqual(['plain', 'REDACTED']);
  });

  test('the legacy form can be forced at a call site', () => {
    // Whatever an editor is configured to do, a caller that needs the old
    // format for compatibility can ask for it around any export.
    const [plain] = selectionJSON([[SerializationContextCompact, false]]);
    expect(plain.version).toBe(1);
  });
});
