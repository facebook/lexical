/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {nodeArbitrary} from '@lexical/fast-check';
import * as fc from 'fast-check';
import {
  $create,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  createEditor,
  type Klass,
  type LexicalNode,
  type NodeKey,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

/**
 * The property this file exists for: a node's `afterCloneFrom` has to carry
 * every property its serialization schema declares, and nothing checks that
 * today. Declaring a new schema property and forgetting to copy it is silent —
 * the field still exists on the clone (the constructor set it), it just holds
 * the constructor's default instead of the value, so the node loses data on the
 * next `getWritable()` rather than failing anywhere.
 *
 * Generated values are what make this work. A hand-written fixture tends to use
 * defaults, and a dropped field compares equal to its default, so the bug is
 * invisible exactly when the test looks like it passed. `nodeArbitrary` draws
 * from the schema's own domain, so the values are in-domain and mostly not the
 * default, and fast-check shrinks a failure to the one property at fault.
 */
function expectCloneCarriesSchemaFields<T extends LexicalNode>(
  klass: Klass<T>,
  props: {readonly [key: string]: unknown},
): void {
  const editor = createEditor({
    namespace: 'clone-property',
    nodes: [klass],
    onError(error) {
      throw error;
    },
  });
  let key: NodeKey = '';
  let before: unknown;
  let original: LexicalNode | null = null;

  // A node is only cloned across updates: within one, $setNodeKey has put it in
  // `_cloneNotNeeded` and getWritable() hands back the very same object, so a
  // single-update test would never reach afterCloneFrom at all.
  editor.update(
    () => {
      const node = $create(klass);
      node.updateFromJSON(props as never);
      $getRoot().clear().append($createParagraphNode().append(node));
      key = node.getKey();
      original = node;
      before = node.exportJSON();
    },
    {discrete: true},
  );

  editor.update(
    () => {
      const writable = $getNodeByKey(key)!.getWritable();
      // The clone actually happened, so what follows is a real assertion.
      expect(writable).not.toBe(original);
      expect(writable.exportJSON()).toEqual(before);
    },
    {discrete: true},
  );
}

describe('a clone carries every serialization schema property', () => {
  test('TextNode', () => {
    fc.assert(
      fc.property(nodeArbitrary(TextNode), props => {
        // Everything but `text` is used exactly as generated. An empty
        // TextNode is removed by normalization between the two updates, so
        // there would be nothing left to clone — this keeps the node alive
        // without constraining any of the properties under test.
        expectCloneCarriesSchemaFields(TextNode, {...props, text: 'x'});
      }),
    );
  });
});
