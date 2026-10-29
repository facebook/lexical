/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Property test of block handles over random documents with random ids
// (random 21-character ids, ids that share long prefixes with others, ids
// shorter than 4 characters, counter ids) and random edits: inserts, deletes,
// moves, replaces, and blocks given an id that shares an existing prefix.
// After every step:
//
// - each block's handle is the brute-force shortest unique prefix of at least
//   MIN_BLOCK_HANDLE_LENGTH characters (or its whole id);
// - each handle, and each whole id, resolves to its own block;
// - the handles of the previous step's read, resolved with that read, name
//   the blocks they named then, or are not found once those are deleted;
// - typo safety: no one-character change of a handle (substitute, drop,
//   add) resolves to a different block, unless the changed string is that
//   block's id or starts with that block's current handle (a handle it could
//   have been given while another id shared more of its prefix).
//
// CI runs a few seeds; set BLOCK_HANDLE_PROPERTY_SEEDS (and optionally
// BLOCK_HANDLE_PROPERTY_FIRST_SEED) to run more locally. The typo-rate
// measurement uses BLOCK_HANDLE_TYPO_DOCS documents of 1,000 blocks
// (default 1) and prints the rate.

import {
  $getBlockById,
  $getBlockHandle,
  $getBlockHandles,
  $getBlockId,
  $resolveBlockHandle,
  BlockIdExtension,
  blockIdState,
  buildEditorFromExtensions,
  configExtension,
  generateBlockId,
  type LexicalEditorWithDispose,
  MIN_BLOCK_HANDLE_LENGTH,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setState,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

const SEEDS = Number(process.env.BLOCK_HANDLE_PROPERTY_SEEDS || 12);
const FIRST_SEED = Number(process.env.BLOCK_HANDLE_PROPERTY_FIRST_SEED || 1);
const STEPS = 25;
const TYPO_DOCS = Number(process.env.BLOCK_HANDLE_TYPO_DOCS || 1);
const TYPO_BLOCKS = 1000;

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(random: () => number, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += ALPHABET[Math.floor(random() * 64)];
  }
  return s;
}

/**
 * Ids of every kind, many of them adversarial: a share of them start with a
 * prefix (1 to 10 characters) of an id issued before.
 */
function idSource(random: () => number) {
  const issued: string[] = [];
  let counter = 0;
  const next = (): string => {
    const r = random();
    let id: string;
    if (r < 0.35 || issued.length === 0) {
      id = randomString(random, 21);
    } else if (r < 0.75) {
      const base = issued[Math.floor(random() * issued.length)];
      const prefix = base.slice(0, 1 + Math.floor(random() * 10));
      const length = Math.max(prefix.length + 1, 4 + Math.floor(random() * 18));
      id = prefix + randomString(random, length - prefix.length);
    } else if (r < 0.85) {
      id = randomString(random, 1 + Math.floor(random() * 3));
    } else {
      id = `c${(++counter).toString(36)}`;
    }
    issued.push(id);
    return id;
  };
  return {issued, next};
}

/** The shortest prefix of `id`, at least 4 long, that no other id starts with. */
function bruteForceHandle(id: string, ids: readonly string[]): string {
  let length = Math.min(MIN_BLOCK_HANDLE_LENGTH, id.length);
  while (
    length < id.length &&
    ids.some(other => other !== id && other.startsWith(id.slice(0, length)))
  ) {
    length++;
  }
  return id.slice(0, length);
}

/** Every string one substitution, deletion or insertion away from `s`. */
function oneCharTypos(s: string): string[] {
  const result = new Set<string>();
  for (let i = 0; i < s.length; i++) {
    result.add(s.slice(0, i) + s.slice(i + 1));
    for (const c of ALPHABET) {
      result.add(s.slice(0, i) + c + s.slice(i + 1));
    }
  }
  for (let i = 0; i <= s.length; i++) {
    for (const c of ALPHABET) {
      result.add(s.slice(0, i) + c + s.slice(i));
    }
  }
  result.delete(s);
  return Array.from(result);
}

function asEdited<T extends LexicalEditor>(editor: T): T {
  const options = {discrete: true, tag: HISTORY_MERGE_TAG} as const;
  editor.update(() => {
    $getRoot().append($createParagraphNode());
  }, options);
  editor.update(() => {
    $getRoot().clear();
  }, options);
  return editor;
}

function $paragraph(text: string): LexicalNode {
  return $createParagraphNode().append($createTextNode(text));
}

interface Typo {
  /** Strings tried. */
  tried: number;
  /** Of those, the ones that resolved to another block. */
  hits: number;
  /** Of the hits, the ones that were exactly that block's handle. */
  exact: number;
}

/**
 * Checks every invariant on the current state, the typo property on the
 * blocks `typoSample` picks, and returns the typo counts.
 */
function check(
  editor: LexicalEditor,
  typoSample: (index: number) => boolean,
  context: string,
): Typo {
  return editor.read(() => {
    const blocks = $getRoot().getChildren();
    const ids = blocks.map(node => $getBlockId(node)!);
    expect(new Set(ids).size, context).toBe(ids.length);
    const handles = $getBlockHandles();
    expect(handles.size, context).toBe(ids.length);
    const handleOfId = new Map<string, string>();
    for (let i = 0; i < blocks.length; i++) {
      const id = ids[i];
      const handle = $getBlockHandle(blocks[i])!;
      expect(handle, `${context} handle of ${id}`).toBe(
        bruteForceHandle(id, ids),
      );
      expect(handles.get(id), context).toBe(handle);
      handleOfId.set(id, handle);
      for (const input of [handle, id]) {
        const result = $resolveBlockHandle(input);
        assert(
          result.status === 'found' && result.node.is(blocks[i]),
          `${context}: ${input} → ${JSON.stringify(result.status)}`,
        );
      }
    }
    const typo: Typo = {exact: 0, hits: 0, tried: 0};
    for (let i = 0; i < blocks.length; i++) {
      if (!typoSample(i)) {
        continue;
      }
      for (const s of oneCharTypos(handleOfId.get(ids[i])!)) {
        typo.tried++;
        const result = $resolveBlockHandle(s);
        if (result.status === 'found' && !result.node.is(blocks[i])) {
          typo.hits++;
          const otherId = $getBlockId(result.node)!;
          const otherHandle = handleOfId.get(otherId)!;
          if (s === otherHandle) {
            typo.exact++;
          }
          assert(
            s === otherId ||
              (otherId.startsWith(s) && s.startsWith(otherHandle)),
            `${context}: typo ${s} of ${handleOfId.get(ids[i])} named ${otherId} (handle ${otherHandle})`,
          );
        } else if (result.status === 'ambiguous') {
          for (const candidate of result.candidates) {
            expect(Array.from(handleOfId.values()), context).toContain(
              candidate,
            );
          }
        }
      }
    }
    return typo;
  });
}

function runSeed(seed: number): void {
  const random = mulberry32(seed);
  const source = idSource(random);
  using editor: LexicalEditorWithDispose = asEdited(
    buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [
        RichTextExtension,
        configExtension(BlockIdExtension, {generateId: source.next}),
      ],
      name: '[block-handle-property]',
    }),
  );
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length)];
  const initial = 20 + Math.floor(random() * 100);
  editor.update(
    () => {
      for (let i = 0; i < initial; i++) {
        $getRoot().append($paragraph(`p${i}`));
      }
    },
    {discrete: true},
  );
  let text = 0;
  let previous = editor.read($getBlockHandles);
  for (let step = 0; step < STEPS; step++) {
    const kind = pick([
      'insert',
      'insert',
      'delete',
      'move',
      'replace',
      'sharedPrefix',
    ]);
    editor.update(
      () => {
        const blocks = $getRoot().getChildren();
        if (kind === 'insert' || blocks.length < 3) {
          for (let n = 1 + Math.floor(random() * 5); n > 0; n--) {
            const at = pick($getRoot().getChildren());
            const block = $paragraph(`t${++text}`);
            if (random() < 0.5) {
              at.insertBefore(block);
            } else {
              at.insertAfter(block);
            }
          }
        } else if (kind === 'delete') {
          for (let n = 1 + Math.floor(random() * 4); n > 0; n--) {
            const children = $getRoot().getChildren();
            if (children.length > 2) {
              pick(children).remove();
            }
          }
        } else if (kind === 'move') {
          const node = pick(blocks);
          const target = pick(blocks);
          if (!node.is(target)) {
            target.insertAfter(node);
          }
        } else if (kind === 'replace') {
          pick(blocks).replace($paragraph(`r${++text}`));
        } else {
          // A block whose id shares a prefix (at least 4 long) of another.
          const base = $getBlockId(pick(blocks))!;
          const prefix = base.slice(
            0,
            Math.min(base.length, 4 + Math.floor(random() * 4)),
          );
          const block = $paragraph(`s${++text}`);
          $setState(
            block,
            blockIdState,
            prefix + randomString(random, 1 + Math.floor(random() * 6)),
          );
          pick(blocks).insertAfter(block);
        }
      },
      {discrete: true},
    );
    // The handles of the previous read name the blocks they named then,
    // while those exist.
    editor.read(() => {
      for (const [id, handle] of previous) {
        const result = $resolveBlockHandle(handle, {read: previous});
        const node = $getBlockById(id);
        if (node === null) {
          expect(result.status, `seed ${seed} step ${step} ${handle}`).toBe(
            'not-found',
          );
        } else {
          assert(
            result.status === 'found' && result.node.is(node),
            `seed ${seed} step ${step} ${handle} → ${result.status}`,
          );
        }
      }
    });
    previous = editor.read($getBlockHandles);
    const last = step === STEPS - 1;
    check(
      editor,
      i => last || i % 9 === step % 9,
      `seed ${seed} step ${step} (${kind})`,
    );
  }
}

describe('block handles: property', () => {
  for (let seed = FIRST_SEED; seed < FIRST_SEED + SEEDS; seed++) {
    test(`seed ${seed}`, () => {
      runSeed(seed);
    });
  }

  test(
    `one-character typo rate, ${TYPO_BLOCKS}-block documents of random 21-character ids`,
    () => {
      let tried = 0;
      let hits = 0;
      let exact = 0;
      for (let doc = 0; doc < TYPO_DOCS; doc++) {
        using editor = buildEditorFromExtensions({
          $initialEditorState: null,
          dependencies: [RichTextExtension, BlockIdExtension],
          name: '[block-handle-typo-rate]',
        });
        editor.setEditorState(
          editor.parseEditorState({
            root: {
              children: Array.from({length: TYPO_BLOCKS}, (_, i) => ({
                $: {blockId: generateBlockId()},
                children: [{text: `Block ${i}`, type: 'text'}],
                type: 'paragraph',
              })),
              type: 'root',
            },
          } as never),
        );
        const typo = check(editor, () => true, `typo doc ${doc}`);
        tried += typo.tried;
        hits += typo.hits;
        exact += typo.exact;
      }
      // Handles of random ids are almost all 4 characters long. A one-character
      // change gives a 3-character string (never a handle), or a 4- or
      // 5-character one that names another block only if it is that block's
      // handle (about 1,000 of 64^4 four-character strings).
      expect(hits / tried).toBeLessThan(1e-3);
      // eslint-disable-next-line no-console
      console.log(
        `block handle typo rate: ${hits} of ${tried} one-character typos ` +
          `(${TYPO_DOCS} × ${TYPO_BLOCKS} blocks) named another block: ` +
          `${(hits / tried).toExponential(2)} (${exact} of them exactly ` +
          `that block's handle)`,
      );
    },
    20000 * TYPO_DOCS,
  );
});
