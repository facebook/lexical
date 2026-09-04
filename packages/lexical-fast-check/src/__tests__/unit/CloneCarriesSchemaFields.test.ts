/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {nodeArbitrary} from '@lexical/fast-check';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import {MarkNode} from '@lexical/mark';
import {HeadingNode} from '@lexical/rich-text';
import * as fc from 'fast-check';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  createEditor,
  type Klass,
  type LexicalExportJSON,
  type LexicalNode,
  type LexicalParseJSON,
  type NodeKey,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

/**
 * The property this file exists for: a node's `afterCloneFrom` has to carry
 * every property its serialization schema declares. Declaring a new schema
 * property and failing to copy it is silent — the field still exists on the
 * clone (the constructor set it), it just holds the constructor's default
 * instead of the value, so the node loses data on the next `getWritable()`
 * rather than failing anywhere.
 *
 * A field-backed property is carried by the `afterCloneFrom` synthesized from
 * the schema, so what these tests watch for is a class where that derivation
 * does not apply: a property declared through accessor methods, which names no
 * field for anything to copy, and a class that writes its own `afterCloneFrom`
 * and so is trusted with all of its own fields.
 *
 * Generated values are what make this work. A hand-written fixture tends to use
 * defaults, and a dropped field compares equal to its default, so the bug is
 * invisible exactly when the test looks like it passed. `nodeArbitrary` draws
 * from the schema's own domain, so the values are in-domain and mostly not the
 * default, and fast-check shrinks a failure to the one property at fault.
 */
function expectCloneCarriesSchemaFields<T extends LexicalNode>(
  klass: Klass<T>,
  props: LexicalParseJSON<LexicalExportJSON<T>>,
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
      node.updateFromJSON(props);
      const root = $getRoot().clear();
      if ($isElementNode(node)) {
        // Kept alive the way the TextNode case is: an empty element is removed
        // between the two updates, and an inline one has to sit in a block.
        node.append($createTextNode('x'));
        root.append(
          node.isInline() ? $createParagraphNode().append(node) : node,
        );
      } else {
        root.append($createParagraphNode().append(node));
      }
      key = node.getKey();
      original = node;
      // An element's exportJSON always writes `children: []` — the tree is
      // serialized by the traversal around it — so the child above does not
      // enter the comparison.
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

  test('HeadingNode', () => {
    fc.assert(
      fc.property(nodeArbitrary(HeadingNode), props => {
        expectCloneCarriesSchemaFields(HeadingNode, props);
      }),
    );
  });

  test('LinkNode', () => {
    fc.assert(
      fc.property(nodeArbitrary(LinkNode), props => {
        expectCloneCarriesSchemaFields(LinkNode, props);
      }),
    );
  });

  test('AutoLinkNode', () => {
    fc.assert(
      fc.property(nodeArbitrary(AutoLinkNode), props => {
        expectCloneCarriesSchemaFields(AutoLinkNode, props);
      }),
    );
  });

  // `ids` is declared through getIDs/setIDs, so no field name is derivable and
  // MarkNode carries it in an afterCloneFrom of its own. This is the case the
  // derivation deliberately does not cover.
  test('MarkNode', () => {
    fc.assert(
      fc.property(nodeArbitrary(MarkNode), props => {
        expectCloneCarriesSchemaFields(MarkNode, props);
      }),
    );
  });
});
