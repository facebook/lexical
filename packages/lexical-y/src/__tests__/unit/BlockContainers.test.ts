/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$insertList} from '@lexical/list';
import {
  $create,
  $getRoot,
  ElementNode,
  INTERNAL_isNodeStructureEnforced,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $block,
  $createBoxNode,
  $p,
  expectConverged,
  NODES,
  setup,
} from '../utils/harness';

// A block container that declares `children: 'block'` (a callout): with the
// node structure enforced, as in every @lexical/y editor, turning one of its
// paragraphs into a list converts that paragraph in place, so what a
// collaborator types in it at the same time is kept. A container that
// declares nothing is replaced by the list (y.md, Limits: Moves).
class DeclaredBoxNode extends ElementNode {
  $config() {
    return this.config('test_declared_box', {
      children: 'block',
      extends: ElementNode,
    });
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}

const nodes = [...NODES, DeclaredBoxNode];

describe('@lexical/y list conversion in a block container', () => {
  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    test(`paragraph -> list in a declared container ‖ type in it keeps the text (${ids})`, async () => {
      const t = await setup(
        () =>
          $getRoot().append(
            $create(DeclaredBoxNode).append($p('Alpha'), $p('Gamma')),
          ),
        {ids, nodes},
      );
      expect(INTERNAL_isNodeStructureEnforced(t.a.editor)).toBe(true);
      t.offline();
      t.a.update(() => {
        $block([0, 0]).selectStart();
        $insertList('bullet');
      });
      t.b.update(() => {
        $block([0, 0]).selectEnd().insertText('X');
      });
      await t.sync();
      await expectConverged(
        t.peers,
        'test_declared_box(list[bullet](listitem("AlphaX")) paragraph("Gamma"))',
      );
    });

    test(`paragraph -> list in a container that declares nothing ‖ type in it (${ids})`, async () => {
      const t = await setup(
        () => $getRoot().append($createBoxNode('o').append($p('Alpha'))),
        {ids, nodes},
      );
      t.offline();
      t.a.update(() => {
        $block([0, 0]).selectStart();
        $insertList('bullet');
      });
      t.b.update(() => {
        $block([0, 0]).selectEnd().insertText('X');
      });
      await t.sync();
      await expectConverged(t.peers);
      // The box is replaced by the list, a move: the typing is lost.
      expect(t.a.describe()).toBe('list[bullet](listitem("Alpha"))');
    });
  }
});
