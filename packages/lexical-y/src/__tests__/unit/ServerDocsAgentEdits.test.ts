/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// The agent edit sketches of the server page
// (packages/lexical-website/docs/collaboration/y-server.md), as written there,
// run over every kind of text node and block they can meet. Keep the two in
// sync (the first test checks it).

import {$createCodeHighlightNode, CodeHighlightNode} from '@lexical/code-core';
import {$getBlockById, $getBlockId, BlockIdExtension} from '@lexical/extension';
import {$createHashtagNode, HashtagNode} from '@lexical/hashtag';
import {
  $create,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  $isTextNode,
  $setSlot,
  defineExtension,
  type LexicalNode,
  type LexicalWarning,
  ParagraphNode,
  TextNode,
} from 'lexical';
import fs from 'node:fs';
import {describe, expect, test} from 'vitest';

import {NESTED_FALLBACK_WARNING} from '../..';
import {
  createYWriter,
  editYState,
  readYState,
  seedYState,
} from '../../headless';
import {SlotBodyNode} from '../utils/slots';

// Changes a text node's text to `next` with one splice: the start and end
// the two texts share stay (and what collaborators type in them), and
// everything from the first difference to the last is replaced. For an
// answer that changes several separate places, splice each change on its
// own (from a diff of the two texts), so the text between them stays too.
function $setTextInPlace(text: TextNode, next: string): void {
  const prev = text.getTextContent();
  let start = 0;
  while (start < prev.length && prev[start] === next[start]) {
    start++;
  }
  let end = 0;
  while (
    end < prev.length - start &&
    end < next.length - start &&
    prev[prev.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++;
  }
  text.spliceText(
    start,
    prev.length - start - end,
    next.slice(start, next.length - end),
  );
}

// The text node of a block that this sketch edits in place, or null: the
// block's only child, plain text, and no named slots. A tab, a hashtag or a
// code token is a text node that does not take any text, and the text of a
// named slot is part of the block's text but not of that child.
function $plainTextOf(block: LexicalNode | null): TextNode | null {
  if (
    !$isElementNode(block) ||
    $getSlotNames(block).length > 0 ||
    block.getChildrenSize() !== 1
  ) {
    return null;
  }
  const text = block.getFirstChild();
  return $isTextNode(text) && text.isSimpleText() ? text : null;
}

/** An app's own text node, such as a mention. */
class MentionNode extends TextNode {
  $config() {
    return this.config('server-docs-mention', {extends: TextNode});
  }
}

/** A paragraph with a named slot (a title shown with it). */
class TitledParagraphNode extends ParagraphNode {
  $config() {
    return this.config('server-docs-titled-paragraph', {
      extends: ParagraphNode,
      slots: ['title'],
    });
  }
}

const AppNodes = defineExtension({
  name: 'server-docs-nodes',
  nodes: () => [
    CodeHighlightNode,
    HashtagNode,
    MentionNode,
    SlotBodyNode,
    TitledParagraphNode,
  ],
});

/** Each block shape: its name, how to make it, and whether the sketch edits it. */
const SHAPES: [string, () => LexicalNode, boolean][] = [
  [
    'plain text',
    () => $createParagraphNode().append($createTextNode('Old text')),
    true,
  ],
  [
    'bold plain text',
    () =>
      $createParagraphNode().append(
        $createTextNode('Old text').toggleFormat('bold'),
      ),
    true,
  ],
  [
    'token text',
    () =>
      $createParagraphNode().append(
        $createTextNode('Old text').setMode('token'),
      ),
    false,
  ],
  [
    'segmented text',
    () =>
      $createParagraphNode().append(
        $createTextNode('Old text').setMode('segmented'),
      ),
    false,
  ],
  ['a tab', () => $createParagraphNode().append($createTabNode()), false],
  [
    'a hashtag',
    () => $createParagraphNode().append($createHashtagNode('#old')),
    false,
  ],
  [
    'a code token',
    () =>
      $createParagraphNode().append($createCodeHighlightNode('old', 'keyword')),
    false,
  ],
  [
    "an app's text node",
    () =>
      $createParagraphNode().append(
        $create(MentionNode).setTextContent('@old').setMode('token'),
      ),
    false,
  ],
  [
    'text and a tab',
    () =>
      $createParagraphNode().append($createTextNode('Old'), $createTabNode()),
    false,
  ],
  [
    'text and a named slot',
    () => {
      const block = $create(TitledParagraphNode).append(
        $createTextNode('Old text'),
      );
      $setSlot(
        block,
        'title',
        $create(SlotBodyNode).append(
          $createParagraphNode().append($createTextNode('Title')),
        ),
      );
      return block;
    },
    false,
  ],
];

/** A block's whole subtree as JSON: its children and named slots too. */
function $subtree(node: LexicalNode): unknown {
  const slots: Record<string, unknown> = {};
  for (const name of $getSlotNames(node)) {
    const slot = $getSlot(node, name);
    slots[name] = slot === null ? null : $subtree(slot);
  }
  return {
    ...node.exportJSON(),
    children: $isElementNode(node) ? node.getChildren().map($subtree) : [],
    slots,
  };
}

describe('server page: agent edits', () => {
  test('the sketch is the same in the docs and the tests', () => {
    const between = (path: string) => {
      const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
      const start = source.indexOf("// Changes a text node's text to `next`");
      const last = source.indexOf('function $plainTextOf', start);
      return source.slice(start, source.indexOf('\n}\n', last) + 2);
    };
    const docs = between(
      '../../../../lexical-website/docs/collaboration/y-server.md',
    );
    expect(docs).toContain('function $setTextInPlace');
    expect(docs).toContain('function $plainTextOf');
    expect(between('./ServerDocsAgentEdits.test.ts')).toBe(docs);
    // The first sketch on the page guards its splice the same way.
    expect(
      fs.readFileSync(
        new URL(
          '../../../../lexical-website/docs/collaboration/y-server.md',
          import.meta.url,
        ),
        'utf8',
      ),
    ).toContain('if ($isTextNode(text) && text.isSimpleText()) {');
  });

  test('edits blocks by id: plain text in place, every other shape refused, nothing thrown', () => {
    const warnings: LexicalWarning[] = [];
    const config = {
      extensions: [AppNodes, BlockIdExtension],
      onWarn: (warning: LexicalWarning) => warnings.push(warning),
      schemaVersion: 1,
    };
    const seen = seedYState(config, () =>
      $getRoot().append(...SHAPES.map(([, $make]) => $make())),
    );
    const before = readYState(seen, config, () =>
      $getRoot()
        .getChildren()
        .map(node => ({
          id: $getBlockId(node),
          json: JSON.stringify($subtree(node)),
          text: node.getTextContent(),
        })),
    );
    expect(before.map(block => block.id)).not.toContain(null);
    // The agent answers every block with new text.
    const ops = before.map(block => ({id: block.id!, text: 'New text'}));
    const unsupported: typeof ops = [];
    const {state} = editYState(
      seen,
      config,
      () => {
        for (const op of ops) {
          const block = $getBlockById(op.id);
          const text = $plainTextOf(block);
          if (text !== null) {
            $setTextInPlace(text, op.text);
          } else if (block !== null) {
            unsupported.push(op);
          }
        }
      },
      {writer: createYWriter('server-docs-agent')},
    );
    // The titled paragraph holds text and declares a slot, so it is stored as
    // a node of its own, with a warning that says so.
    expect(
      warnings.filter(warning => warning.code !== NESTED_FALLBACK_WARNING),
    ).toEqual([]);
    const after = readYState(state, config, () =>
      $getRoot()
        .getChildren()
        .map(node => ({
          json: JSON.stringify($subtree(node)),
          text: node.getTextContent(),
        })),
    );
    SHAPES.forEach(([name, , edited], i) => {
      if (edited) {
        expect(after[i].text, name).toBe('New text');
      } else {
        expect(after[i].json, name).toBe(before[i].json);
        expect(
          unsupported.map(op => op.id),
          name,
        ).toContain(before[i].id);
      }
    });
    expect(unsupported).toHaveLength(SHAPES.filter(([, , e]) => !e).length);
  });

  test('a splice at the first text node skips a tab or a token there', () => {
    const warnings: LexicalWarning[] = [];
    for (const [name, , edited] of SHAPES.slice(0, 8)) {
      const config = {
        extensions: [AppNodes],
        onWarn: (warning: LexicalWarning) => warnings.push(warning),
        schemaVersion: 1,
      };
      const shape = SHAPES.find(([shapeName]) => shapeName === name)!;
      const seen = seedYState(config, () => $getRoot().append(shape[1]()));
      const old = readYState(seen, config, () => $getRoot().getTextContent());
      const {state} = editYState(
        seen,
        config,
        () => {
          const text = $getRoot().getFirstDescendant();
          if ($isTextNode(text) && text.isSimpleText()) {
            text.spliceText(0, 5, 'Hi');
          }
        },
        {writer: createYWriter('server-docs-agent')},
      );
      const now = readYState(state, config, () => $getRoot().getTextContent());
      expect(now, name).toBe(edited ? 'Hi' + old.slice(5) : old);
    }
    expect(
      warnings.filter(warning => warning.code !== NESTED_FALLBACK_WARNING),
    ).toEqual([]);
  });
});
