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
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableExtension,
} from '@lexical/table';
import {mergeUpdates} from '@y/y';
import {
  $create,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $getSlotHost,
  $getSlotNames,
  $getSlotNameWithinHost,
  $isElementNode,
  $isRootNode,
  $isTextNode,
  $setSlot,
  defineExtension,
  ElementNode,
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
// block's only child, plain text, and no named slots. A tab does not take
// text, a hashtag or a code token would keep its type around the new text,
// and the text of a named slot is part of the block's text but not of that
// child.
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

// Where the block with this id is and what it holds, or null when no block
// has the id: the path from it up to the root (through the hosts of named
// slots), each node on it by its id or, for one without (a table cell, by
// default), by its type, and each by its place: the slot it fills, or its
// index in its parent; and its text. A collaborator's move of the block or
// of a container it is in changes the path; a replace changes the text
// (unless the new block has the same text).
function $placeOf(id: string): string | null {
  const block = $getBlockById(id);
  if (block === null) {
    return null;
  }
  const path: unknown[] = [];
  for (
    let node: LexicalNode | null = block;
    node !== null && !$isRootNode(node);
    node = node.getParent() ?? $getSlotHost(node)
  ) {
    path.push([
      $getBlockId(node) ?? node.getType(),
      $getSlotNameWithinHost(node) ?? node.getIndexWithinParent(),
    ]);
  }
  return JSON.stringify([path, block.getTextContent()]);
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

/** A block with two named slots, side by side. */
class TwoSlotNode extends ElementNode {
  $config() {
    return this.config('server-docs-two-slots', {
      extends: ElementNode,
      slots: ['left', 'right'],
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
    TwoSlotNode,
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
      const last = source.indexOf('function $placeOf', start);
      return source.slice(start, source.indexOf('\n}\n', last) + 2);
    };
    const docs = between(
      '../../../../lexical-website/docs/collaboration/y-server.md',
    );
    expect(docs).toContain('function $setTextInPlace');
    expect(docs).toContain('function $plainTextOf');
    expect(docs).toContain('function $placeOf');
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

  test('step 3 sends back a target that is gone, moved, replaced, typed in or new since the read, and applies the rest', () => {
    const config = {extensions: [BlockIdExtension], schemaVersion: 1};
    // "Keep me." is not next to anything the collaborator changes (a block
    // next to an inserted, deleted or moved block goes back too).
    const lines = [
      'First line.',
      'Move me.',
      'Last line.',
      'Spacer.',
      'Keep me.',
    ];
    const seen = seedYState(config, () =>
      $getRoot().append(
        ...lines.map(line =>
          $createParagraphNode().append($createTextNode(line)),
        ),
      ),
    );
    const ids = readYState(seen, config, () =>
      $getRoot()
        .getChildren()
        .map(node => $getBlockId(node)!),
    );
    const $block = (i: number) => $getBlockById(ids[i])!;
    const collaborator = createYWriter('server-docs-collaborator');
    const agent = createYWriter('server-docs-agent');
    // Each case: what the collaborator does, what the target then holds, and
    // whether "Keep me." still gets the agent's edit (a delete before it in
    // the same container changes its place, so it goes back too).
    const cases: [string, () => void, string, boolean][] = [
      ['untouched', () => {}, 'Move me now.', true],
      // A move keeps the id: the target is now after "Last line.".
      ['moved', () => void $block(2).insertAfter($block(1)), 'Move me.', true],
      [
        'replaced',
        () =>
          void $block(1).replace(
            $createParagraphNode().append($createTextNode('A slow dog.')),
          ),
        'A slow dog.',
        true,
      ],
      [
        'typed in',
        () =>
          void (
            ($block(1) as ElementNode).getFirstChild() as TextNode
          ).spliceText(0, 0, 'Please '),
        'Please Move me.',
        true,
      ],
      ['deleted', () => void $block(1).remove(), '', false],
    ];
    for (const [name, $collaborate, expected, keepApplies] of cases) {
      const latest = editYState(seen, config, $collaborate, {
        writer: collaborator,
      }).state;
      const ops = [
        {id: ids[1], text: 'Move me now.'},
        {id: ids[4], text: 'Keep me now.'},
      ];
      // Step 3 as in the docs.
      const wasAt = readYState(seen, config, () =>
        ops.map(op => $placeOf(op.id)),
      );
      const isAt = readYState(latest, config, () =>
        ops.map(op => $placeOf(op.id)),
      );
      const live = new Set(
        ops
          .filter((op, i) => wasAt[i] !== null && wasAt[i] === isAt[i])
          .map(op => op.id),
      );
      const gone = ops.filter(op => !live.has(op.id));
      const unsupported: typeof ops = [];
      // Step 4 as in the docs.
      const {update} = editYState(
        seen,
        config,
        () => {
          for (const op of ops) {
            const block = live.has(op.id) ? $getBlockById(op.id) : null;
            const text = $plainTextOf(block);
            if (text !== null) {
              $setTextInPlace(text, op.text);
            } else if (block !== null) {
              unsupported.push(op);
            }
          }
        },
        {writer: agent},
      );
      const merged =
        update === null
          ? latest
          : mergeUpdates([latest, update] as Uint8Array<ArrayBuffer>[]);
      const texts = readYState(merged, config, () =>
        $getRoot()
          .getChildren()
          .map(node => node.getTextContent()),
      );
      expect(
        gone.map(op => op.id),
        name,
      ).toEqual(
        name === 'untouched' ? [] : keepApplies ? [ids[1]] : [ids[1], ids[4]],
      );
      expect(unsupported, name).toEqual([]);
      // The target holds what the collaborator left (or the agent's text when
      // it was untouched), and no text is glued to another line.
      const target = readYState(
        merged,
        config,
        () => $getBlockById(ids[1])?.getTextContent() ?? '',
      );
      expect(target, name).toBe(expected);
      const keep = keepApplies ? 'Keep me now.' : 'Keep me.';
      expect(texts, name).toContain(keep);
      expect(
        texts.filter(text => text !== expected),
        name,
      ).toEqual(
        lines
          .filter(line => line !== 'Move me.' && line !== 'Keep me.')
          .concat(keep),
      );
    }
    // A target that exists only on the latest state (added after the read)
    // goes back too.
    const added = editYState(
      seen,
      config,
      () => void $block(4).insertAfter($createParagraphNode()),
      {writer: collaborator},
    ).state;
    const newId = readYState(
      added,
      config,
      () => $getBlockId($getRoot().getLastChild()!)!,
    );
    expect(readYState(seen, config, () => $placeOf(newId))).toBeNull();
    expect(readYState(added, config, () => $placeOf(newId))).not.toBeNull();
  });

  test('replacing a line keeps what a collaborator typed at the same time, at the start of the new text (typed at the end, possibly at the end)', () => {
    const config = {extensions: [BlockIdExtension], schemaVersion: 1};
    const seen = seedYState(config, () =>
      $getRoot().append(
        $createParagraphNode().append($createTextNode('The quick brown fox.')),
      ),
    );
    const id = readYState(
      seen,
      config,
      () => $getBlockId($getRoot().getFirstChild()!)!,
    );
    const outcomes = new Map<string, Set<string>>();
    // Fresh writers each round, so both client-id orders occur.
    for (let round = 0; round < 12; round++) {
      for (const [where, offset, typed] of [
        ['start', 0, 'Big '],
        ['middle', 4, 'very '],
        ['end', 20, ' Jumps!'],
      ] as const) {
        const replace = editYState(
          seen,
          config,
          () =>
            void $getBlockById(id)!.replace(
              $createParagraphNode().append(
                $createTextNode('The quick red fox.'),
              ),
            ),
          {writer: createYWriter(`server-docs-agent-${round}`)},
        ).update!;
        const type = editYState(
          seen,
          config,
          () =>
            void (
              ($getBlockById(id) as ElementNode).getFirstChild() as TextNode
            ).spliceText(offset, 0, typed),
          {writer: createYWriter(`server-docs-collaborator-${round}`)},
        ).update!;
        const text = readYState(
          mergeUpdates([seen, replace, type] as Uint8Array<ArrayBuffer>[]),
          config,
          () => $getRoot().getTextContent(),
        );
        if (!outcomes.has(where)) {
          outcomes.set(where, new Set());
        }
        outcomes.get(where)!.add(text);
      }
    }
    expect([...outcomes.get('start')!]).toEqual(['Big The quick red fox.']);
    expect([...outcomes.get('middle')!]).toEqual(['very The quick red fox.']);
    for (const text of outcomes.get('end')!) {
      expect([
        ' Jumps!The quick red fox.',
        'The quick red fox. Jumps!',
      ]).toContain(text);
    }
  });

  test('step 3 sends back a target moved between table cells, or in a table a collaborator moved', () => {
    const config = {
      extensions: [TableExtension, BlockIdExtension],
      schemaVersion: 1,
    };
    // A table whose cells hold "Target" and "Dest", after a paragraph.
    const seen = seedYState(config, () =>
      $getRoot().append(
        $createParagraphNode().append($createTextNode('Intro')),
        $createTableNode().append(
          $createTableRowNode().append(
            ...['Target', 'Dest'].map(text =>
              $createTableCellNode().append(
                $createParagraphNode().append($createTextNode(text)),
              ),
            ),
          ),
        ),
        $createParagraphNode().append($createTextNode('Outro')),
      ),
    );
    const $cells = () =>
      (
        (
          $getRoot().getChildAtIndex(1) as ElementNode
        ).getFirstChildOrThrow() as ElementNode
      ).getChildren() as ElementNode[];
    const id = readYState(
      seen,
      config,
      () => $getBlockId($cells()[0].getFirstChildOrThrow())!,
    );
    const collaborator = createYWriter('server-docs-collaborator');
    const cases: [string, () => void, boolean][] = [
      ['untouched', () => {}, true],
      [
        'moved to the next cell',
        () => {
          const [from, to] = $cells();
          to.clear().append(from.getFirstChildOrThrow());
          from.append($createParagraphNode());
        },
        false,
      ],
      [
        'in a table moved below the next paragraph',
        () =>
          void $getRoot()
            .getLastChildOrThrow()
            .insertAfter($getRoot().getChildAtIndex(1)!),
        false,
      ],
    ];
    for (const [name, $collaborate, applies] of cases) {
      const latest = editYState(seen, config, $collaborate, {
        writer: collaborator,
      }).state;
      const wasAt = readYState(seen, config, () => $placeOf(id));
      const isAt = readYState(latest, config, () => $placeOf(id));
      expect(wasAt !== null && wasAt === isAt, name).toBe(applies);
    }
  });

  test('step 3 sends back a target moved from one named slot to another', () => {
    const config = {
      extensions: [AppNodes, BlockIdExtension],
      onWarn: () => {},
      schemaVersion: 1,
    };
    const seen = seedYState(config, () => {
      const host = $create(TwoSlotNode);
      $setSlot(
        host,
        'left',
        $create(SlotBodyNode).append(
          $createParagraphNode().append($createTextNode('Target')),
        ),
      );
      $setSlot(
        host,
        'right',
        $create(SlotBodyNode).append(
          $createParagraphNode().append($createTextNode('Other')),
        ),
      );
      $getRoot().append(
        $createParagraphNode().append($createTextNode('Intro')),
        host,
      );
    });
    const $slot = (name: string) =>
      $getSlot($getRoot().getLastChildOrThrow(), name) as ElementNode;
    const id = readYState(
      seen,
      config,
      () => $getBlockId($slot('left').getFirstChildOrThrow())!,
    );
    const collaborator = createYWriter('server-docs-collaborator');
    const cases: [string, () => void, boolean][] = [
      ['untouched', () => {}, true],
      [
        // First in the other slot, as it was first in its own.
        'moved to the other slot',
        () => {
          const target = $slot('left').getFirstChildOrThrow();
          $slot('right').getFirstChildOrThrow().insertBefore(target);
          $slot('left').append($createParagraphNode());
        },
        false,
      ],
    ];
    for (const [name, $collaborate, applies] of cases) {
      const latest = editYState(seen, config, $collaborate, {
        writer: collaborator,
      }).state;
      const wasAt = readYState(seen, config, () => $placeOf(id));
      const isAt = readYState(latest, config, () => $placeOf(id));
      expect(wasAt !== null && wasAt === isAt, name).toBe(applies);
    }
  });
});
