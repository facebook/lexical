/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// The "Handles and collaboration" example of the Block IDs documentation page
// (packages/lexical-website/docs/extensions/block-ids.md): an agent that
// addresses blocks by handle on a server resolves each handle against the
// stored state with the handles it was shown, then applies the edit in place
// to the state it read, by id, and merges. Keep the two in sync.

import {
  $getBlockById,
  $getBlockHandle,
  $getBlockHandles,
  $getBlockId,
  $resolveBlockHandle,
  BlockIdExtension,
  blockIdState,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import * as Y from '@y/y';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlotNames,
  $isElementNode,
  $isTextNode,
  $setState,
  type ElementNode,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {
  createYWriter,
  editYState,
  readYState,
  seedYState,
} from '../../headless';

// As on the Block IDs page.
// Changes a block's text in place: only the characters that differ, in the
// block's own text nodes. block.replace(newBlock) would re-create the block,
// and what a collaborator types in it meanwhile would not stay where they
// typed it. Returns false, changing nothing, unless the block holds only text,
// directly or in inline elements such as links: no line breaks, nested blocks,
// named slots or decorators, even ones without text.
function $setBlockText(block: LexicalNode, text: string): boolean {
  if (!$isElementNode(block) || !$holdsOnlyText(block)) {
    return false;
  }
  const nodes = block.getAllTextNodes();
  const old = nodes.map(node => node.getTextContent()).join('');
  let start = 0;
  while (start < old.length && old[start] === text[start]) {
    start++;
  }
  let end = 0;
  while (
    end < old.length - start &&
    end < text.length - start &&
    old[old.length - 1 - end] === text[text.length - 1 - end]
  ) {
    end++;
  }
  const inserted = text.slice(start, text.length - end);
  const deleteEnd = old.length - end;
  let offset = 0;
  let done = false;
  for (const node of nodes) {
    const size = node.getTextContentSize();
    const from = Math.max(start - offset, 0);
    const to = Math.min(deleteEnd - offset, size);
    if (
      !done &&
      (start - offset < size ||
        (start - offset === size && start === deleteEnd))
    ) {
      // The node where the change starts (for an insert at a node boundary,
      // the node before it): delete and insert there.
      node.spliceText(from, Math.max(to - from, 0), inserted);
      done = true;
    } else if (to > from) {
      node.spliceText(from, to - from, '');
    }
    offset += size;
  }
  if (!done && inserted !== '') {
    block.append($createTextNode(inserted));
  }
  return true;
}

function $holdsOnlyText(element: ElementNode): boolean {
  // Named slots hold blocks of their own (and count in getTextContent).
  return (
    $getSlotNames(element).length === 0 &&
    element
      .getChildren()
      .every(
        child =>
          $isTextNode(child) ||
          ($isElementNode(child) && child.isInline() && $holdsOnlyText(child)),
      )
  );
}

describe('block handles with @lexical/y', () => {
  test('resolving against the stored state, applying to the read in place', () => {
    const config = {
      extensions: [RichTextExtension, BlockIdExtension],
      onWarn: () => {},
      schemaVersion: 1,
    };
    const agent = createYWriter('Writing assistant');
    const person = createYWriter('Person');
    const seed = seedYState(config, () => {
      for (const [id, text] of [
        ['abcd1111', 'Q3 plan'],
        ['wxyz2222', 'Revenue grew 4%.'],
        ['mnop3333', 'Hiring is on track.'],
        ['b123', 'Short id'],
        ['b123456', 'Its prefix is the short id'],
      ]) {
        const node = $createParagraphNode().append($createTextNode(text));
        $setState(node, blockIdState, id);
        $getRoot().append(node);
      }
    });
    const handlesOf = (state: Uint8Array) =>
      readYState(state, config, () =>
        $getRoot()
          .getChildren()
          .map(node => [$getBlockHandle(node), node.getTextContent()]),
      );
    const merge = (...updates: Uint8Array[]) =>
      Y.mergeUpdates(updates as Uint8Array<ArrayBuffer>[]);

    // At the read: `seen` is the state the model reads; keep the handles it
    // is shown with it.
    const seen = seed;
    const shown = readYState(seen, config, () => $getBlockHandles());

    // The documented steps, for one op.
    const applyByHandle = (
      stored: Uint8Array,
      op: {block: string; text: string},
    ): {stored: Uint8Array; told: string | null} => {
      // 1. Resolve against the stored state, with the handles the model was
      //    shown.
      const target = readYState(stored, config, () => {
        const result = $resolveBlockHandle(op.block, {read: shown});
        return result.status === 'found'
          ? {id: $getBlockId(result.node)!, status: result.status}
          : result;
      });
      if (target.status !== 'found') {
        return {stored, told: target.status};
      }
      // 2. Apply it to the state the model read, by id, in place.
      let applied = false;
      const {update} = editYState(
        seen,
        config,
        () => {
          applied = $setBlockText($getBlockById(target.id)!, op.text);
        },
        {writer: agent},
      );
      if (!applied) {
        return {stored, told: 'not just text'};
      }
      // 3. Merge `update` into the stored state.
      return {
        stored: update === null ? stored : merge(stored, update),
        told: null,
      };
    };

    // What the model reads.
    expect(handlesOf(seen)).toEqual([
      ['abcd', 'Q3 plan'],
      ['wxyz', 'Revenue grew 4%.'],
      ['mnop', 'Hiring is on track.'],
      ['b123', 'Short id'],
      ['b1234', 'Its prefix is the short id'],
    ]);

    // Meanwhile, a person types in the block the model rewrites, deletes the
    // third block and the one with the short id, and adds one whose id shares
    // the first's prefix.
    const typed = editYState(
      seed,
      config,
      () => {
        const [, revenue, hiring] = $getRoot().getChildren();
        assert($isElementNode(revenue));
        const text = revenue.getFirstDescendant();
        assert($isTextNode(text));
        // "Revenue grew |4%." → "Revenue grew about 4%."
        text.spliceText(13, 0, 'about ');
        hiring.remove();
        $getBlockById('b123')!.remove();
        const node = $createParagraphNode().append($createTextNode('Q4 plan'));
        $setState(node, blockIdState, 'abcd9999');
        $getRoot().append(node);
      },
      {writer: person},
    );
    let stored = typed.state;

    // The model's answers, made from what it read.
    const told: (string | null)[] = [];
    for (const op of [
      {block: 'wxyz', text: 'Revenue grew 6%.'},
      // Deleted since the read.
      {block: 'mnop', text: 'Hiring is ahead.'},
      // Deleted since the read; without the read, b123456 would take it.
      {block: 'b123', text: 'Edited'},
      // A block added since shares the prefix: still the block read.
      {block: 'abcd', text: 'Q3 goals'},
    ]) {
      const result = applyByHandle(stored, op);
      stored = result.stored;
      told.push(result.told);
    }
    expect(told).toEqual([null, 'not-found', 'not-found', null]);
    expect(
      readYState(stored, config, () => $resolveBlockHandle('b123').status),
    ).toBe('found');
    // The edits landed in place: the person's typing stays where they typed.
    expect(readYState(stored, config, () => $getRoot().getTextContent())).toBe(
      'Q3 goals\n\nRevenue grew about 6%.\n\nIts prefix is the short id\n\nQ4 plan',
    );

    // A prefix freed by a deletion and taken by a block added since: without
    // the read it names the new block, with it the block read is gone.
    const reused = editYState(
      seed,
      config,
      () => {
        $getBlockById('mnop3333')!.remove();
        const node = $createParagraphNode().append($createTextNode('New'));
        $setState(node, blockIdState, 'mnop4444');
        $getRoot().append(node);
      },
      {writer: person},
    ).state;
    expect(
      readYState(reused, config, () => $resolveBlockHandle('mnop').status),
    ).toBe('found');
    expect(
      applyByHandle(reused, {block: 'mnop', text: 'Hiring is ahead.'}).told,
    ).toBe('not-found');

    // Resolved inside the edit of the read instead, the deleted block is
    // always found.
    expect(
      readYState(seen, config, () => $resolveBlockHandle('mnop').status),
    ).toBe('found');

    // Why in place: replacing the block re-creates it, and the person's
    // concurrent typing no longer stays where they typed it.
    const {update: replaced} = editYState(
      seen,
      config,
      () => {
        $getBlockById('wxyz2222')!.replace(
          $createParagraphNode().append($createTextNode('Revenue grew 6%.')),
        );
      },
      {writer: agent},
    );
    expect(
      readYState(merge(typed.state, replaced!), config, () =>
        $getRoot().getTextContent(),
      ),
    ).toBe(
      'Q3 plan\n\nabout Revenue grew 6%.\n\nIts prefix is the short id\n\nQ4 plan',
    );
  });
});
