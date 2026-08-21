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
  $selectAll,
  $withSerializationContext,
  type AnySerializationStateConfigPair,
  SerializationContextCompact,
  type SerializedPartial,
  type SerializedTextNode,
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

// The selection covers only text nodes, and a compact export omits any
// property equal to its default, so the payload is a partial text node.
type SelectedTextJSON = SerializedPartial<SerializedTextNode>;

function selectionJSON(
  pairs: readonly AnySerializationStateConfigPair[] = [],
): SelectedTextJSON[] {
  using editor = buildEditorFromExtensions({
    dependencies: [extension],
    name: '[root]',
    namespace: '',
    onError: err => {
      throw err;
    },
  });
  let nodes: SelectedTextJSON[] = [];
  editor.update(
    () => {
      $selectAll();
      nodes = $withSerializationContext(pairs)(
        () =>
          $generateJSONFromSelectedNodes<SelectedTextJSON>(
            editor,
            $getSelection(),
          ).nodes,
      );
    },
    {discrete: true},
  );
  return nodes;
}

// A RangeSelection over a paragraph's contents yields its text nodes at the
// top level of the payload, with no paragraph wrapper.
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

  test('the legacy form can be forced at a call site', () => {
    // Whatever an editor is configured to do, a caller that needs the old
    // format for compatibility can ask for it around any export.
    const [plain] = selectionJSON([[SerializationContextCompact, false]]);
    expect(plain.version).toBe(1);
  });
});
