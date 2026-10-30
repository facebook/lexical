/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Regression cases for text identity findings of the #9400 reviews whose
// original repros were not committed. Each case is named after its finding.
// The author's write must keep the characters it did not touch, so a peer's
// concurrent delete or typing there stays where it was made, on every client
// and a fresh reader.

import {$createCodeNode, $isCodeNode} from '@lexical/code-core';
import {CodePrismExtension} from '@lexical/code-prism';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {HashtagNode, registerLexicalHashtag} from '@lexical/hashtag';
import {$createLinkNode, type LinkNode} from '@lexical/link';
import {$createMarkNode} from '@lexical/mark';
import {registerLexicalTextEntity} from '@lexical/text';
import * as Y from '@y/y';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
  $setSelection,
  configExtension,
  defineExtension,
  type ElementNode,
  INTERNAL_$recordTextMove,
  INTERNAL_$recordTextRetype,
  type LexicalEditor,
  type LexicalNode,
  TextNode,
} from 'lexical';
import {describe, expect, test, vi} from 'vitest';

import {createYDoc, YCollabExtension} from '../../..';
import {
  expectConverged,
  flush,
  freshReader,
  NODES,
  type Peer,
  setup,
} from '../../utils/harness';

const $line = () => $getRoot().getChildAtIndex(1) as ElementNode;
const lineText = (p: Peer) => p.read(() => $line().getTextContent());

/** The text a peer's local transactions insert and delete. */
function track(doc: Y.Doc): {ins: string; del: string} {
  const w = {del: '', ins: ''};
  doc.on('afterTransaction', (tr: Y.Transaction) => {
    if (!tr.local) {
      return;
    }
    Y.iterateStructsByIdSet(tr, tr.insertSet, s => {
      if (s instanceof Y.Item && s.content instanceof Y.ContentString) {
        w.ins += s.content.str;
      }
    });
    Y.iterateStructsByIdSet(tr, tr.deleteSet, s => {
      if (s instanceof Y.Item && s.content instanceof Y.ContentString) {
        w.del += s.content.str;
      }
    });
  });
  return w;
}

async function expectEverywhere(peers: Peer[], expected: string) {
  const fresh = await freshReader(peers[0]);
  expect([...peers, fresh].map(lineText)).toEqual(
    [...peers, fresh].map(() => expected),
  );
  await expectConverged(peers);
}

const IDS = [
  [1, 2],
  [2, 1],
];

// R14B-C1: Lexical's normalization record names every node a merge touched,
// not which one the merged text ended in. "head " | **"same "** | _"same "_ |
// <u>"same "</u> | `tail`: unbolding the first "same " merges the next two
// runs into one bold "same same ", which the same update then removes (a
// transform, or node edits); the last "same " joins "head ". The removed
// intermediate run must not be taken for the origin of the survivor's
// characters.
describe('R14B-C1: a merged intermediate run that the same update removes', () => {
  for (const ids of IDS) {
    for (const path of ['transform', 'node edits'] as const) {
      for (const [peerEdit, expected] of [
        ['deletes "sa" of the surviving run', 'head me tail'],
        ['types "NEW " before the surviving run', 'head NEW same tail'],
        ['deletes "sa" of a removed run', 'head same tail'],
      ] as const) {
        test(`R14B-C1 ${path}; the peer ${peerEdit} (ids ${ids}): the survivor keeps its characters`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $createTextNode('head '),
                  $createTextNode('same ').toggleFormat('bold'),
                  $createTextNode('same ').toggleFormat('italic'),
                  $createTextNode('same ').toggleFormat('underline'),
                  $createTextNode('tail').toggleFormat('code'),
                ),
              );
              $setSelection(null);
            },
            {ids},
          );
          let armed = false;
          const stops = t.peers.map(peer =>
            peer.editor.registerNodeTransform(TextNode, node => {
              if (
                armed &&
                node.getTextContent() === 'same same ' &&
                node.hasFormat('bold')
              ) {
                const next = node.getNextSibling();
                node.remove();
                if (next instanceof TextNode) {
                  next.setFormat(0);
                }
              }
            }),
          );
          await flush();
          await t.sync();
          t.offline();
          armed = true;
          t.a.update(() => {
            const nodes = $line().getAllTextNodes();
            if (path === 'transform') {
              nodes[2].setFormat(1);
            } else {
              nodes[1].remove();
              nodes[2].remove();
              nodes[3].setFormat(0);
            }
            $setSelection(null);
          });
          expect(lineText(t.a)).toBe('head same tail');
          t.b.update(() => {
            const nodes = $line().getAllTextNodes();
            if (peerEdit.startsWith('types')) {
              nodes[3].select(0, 0).insertText('NEW ');
            } else {
              nodes[peerEdit.endsWith('surviving run') ? 3 : 1]
                .select(0, 2)
                .removeText();
            }
            $setSelection(null);
          });
          await t.sync();
          await expectEverywhere(t.peers, expected);
          stops.forEach(stop => stop());
        });
      }
    }
  }
});

// R17A-2: a plain-text paste (`insertRawText`, what PASTE_COMMAND does for
// text/plain) over a selection was written as a whole-word rewrite
// (`del "abcdef" ins "abXYef"`), so a peer's concurrent delete of "a" came
// back. The author deletes only the selected characters.
describe('R17A-2: a plain-text paste inside one text node', () => {
  for (const [name, from, to, expected] of [
    ['over a selection', 2, 4, 'bXYef ghi'],
    ['at a caret', 3, 3, 'bcXYdef ghi'],
    ['over a selection across two words', 2, 8, 'bXYhi'],
  ] as const) {
    test(`R17A-2 paste "XY" ${name}; the peer deletes "a": only the selection is deleted`, async () => {
      const t = await setup(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Title')),
          $createParagraphNode().append($createTextNode('abcdef ghi')),
        );
      });
      const w = track(t.a.doc);
      t.offline();
      t.a.update(() => {
        ($line().getFirstChild() as TextNode)
          .select(from, to)
          .insertRawText('XY');
      });
      expect(w.del).toBe('abcdef ghi'.slice(from, to));
      t.b.update(() => {
        ($line().getFirstChild() as TextNode).spliceText(0, 1, '', false);
        $setSelection(null);
      });
      await t.sync();
      await expectEverywhere(t.peers, expected);
    });
  }
});

// R20B-F1: a text node set whole (prepended to) and, in the same update, a
// node made right before it whose text equals the set node's old text. "head
// " | _"one two"_ | <u>" tail"</u>: without a caret, set the italic node to
// "Z one two" and insert a bold "one two" before it. The made node's text
// took the alignment, so the set node's old characters were written anew and
// a peer's concurrent delete of its "n" came back. Text
// a node made holds now takes no old characters from set text.
describe('R20B-F1: a node made before a node set whole, with the set node’s old text', () => {
  const TEXTS = ['one two', 'aa aa', 'ab'];
  type Variant = 'equal made before' | 'set alone' | 'other text made before';
  const variants: Variant[] = [
    'equal made before',
    'set alone',
    'other text made before',
  ];
  for (const text of TEXTS) {
    for (const variant of variants) {
      for (const ids of IDS) {
        const made =
          variant === 'set alone'
            ? ''
            : variant === 'equal made before'
              ? text
              : 'xy zz';
        const expected = `head ${made}Z ${text[0]}${text.slice(2)} tail`;
        test(`R20B-F1 "${text}": ${variant} (ids ${ids}); the peer deletes the old second character`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $createTextNode('head '),
                  $createTextNode(text).toggleFormat('italic'),
                  $createTextNode(' tail').toggleFormat('underline'),
                ),
              );
            },
            {ids},
          );
          t.offline();
          t.a.update(() => {
            const set = $line().getChildAtIndex(1) as TextNode;
            set.setTextContent(`Z ${text}`);
            if (made !== '') {
              set.insertBefore($createTextNode(made).toggleFormat('bold'));
            }
            $setSelection(null);
          });
          t.b.update(() => {
            ($line().getChildAtIndex(1) as TextNode).spliceText(
              1,
              1,
              '',
              false,
            );
            $setSelection(null);
          });
          await t.sync();
          await expectEverywhere(t.peers, expected);
        });
      }
    }
  }
});

// R20B-F2: text moved whole from a removed node into a node set whole, with
// a node made after it. "head " | _"ab"_ | **"cd"** | <u>" tail"</u>: without a
// caret, set the italic node to "abcd", remove the bold node and insert a
// bold "Q " after the italic one. The common start covers "abcd" (the set
// node's old "ab" and all of the removed "cd"), but the removed text was
// aligned only when the common end covered it too, so "cd" was written anew
// and a peer's concurrent delete of its "c" came back.
// The made-before cases are controls.
describe('R20B-F2: text moved from a removed node into a node set whole, then a node made', () => {
  const PAIRS = [
    ['ab', 'cd'],
    ['one ', 'two'],
    [' ', 'one two'],
  ] as const;
  for (const [x, y] of PAIRS) {
    for (const madeBefore of [false, true]) {
      for (const ids of IDS) {
        const expected = `head ${madeBefore ? 'Q ' : ''}${x}${y.slice(1)}${
          madeBefore ? '' : 'Q '
        } tail`;
        test(`R20B-F2 "${x}" + "${y}": made ${
          madeBefore ? 'before' : 'after'
        } (ids ${ids}); the peer deletes the moved text's first character`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $createTextNode('head ').toggleFormat('underline'),
                  $createTextNode(x).toggleFormat('italic'),
                  $createTextNode(y).toggleFormat('bold'),
                  $createTextNode(' tail').toggleFormat('underline'),
                ),
              );
            },
            {ids},
          );
          const w = track(t.a.doc);
          t.offline();
          t.a.update(() => {
            const set = $line().getChildAtIndex(1) as TextNode;
            set.setTextContent(x + y);
            ($line().getChildAtIndex(2) as TextNode).remove();
            const made = $createTextNode('Q ').toggleFormat('bold');
            if (madeBefore) {
              set.insertBefore(made);
            } else {
              set.insertAfter(made);
            }
            $setSelection(null);
          });
          expect(w).toEqual({del: '', ins: 'Q '});
          t.b.update(() => {
            ($line().getChildAtIndex(2) as TextNode).spliceText(
              0,
              1,
              '',
              false,
            );
            $setSelection(null);
          });
          await t.sync();
          await expectEverywhere(t.peers, expected);
        });
      }
    }
  }
});

// R20A-1: a text set, then a delete of part of the text just set, in one
// update: the stretch was given up (arrived text deleted in part), so the
// set node's old text was written anew and a peer's concurrent delete of
// its first character came back. What is left of the set
// text is aligned as it is.
describe('R20A-1: a node set whole, then part of its new text deleted, in one update', () => {
  for (const [name, next, from, to, expected] of [
    ['"abc defX", then Backspace the "X"', 'abc defX', 7, 8, 'bc def'],
    ['"abc def ghi", then delete "def "', 'abc def ghi', 4, 8, 'bc ghi'],
  ] as const) {
    for (const ids of IDS) {
      test(`R20A-1 set ${name} (ids ${ids}); the peer deletes "a"`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append($createTextNode('abc def')),
            );
          },
          {ids},
        );
        t.offline();
        t.a.update(() => {
          const node = $line().getFirstChild() as TextNode;
          node.setTextContent(next);
          node.select(from, to).removeText();
          $setSelection(null);
        });
        t.b.update(() => {
          ($line().getFirstChild() as TextNode).spliceText(0, 1, '', false);
          $setSelection(null);
        });
        await t.sync();
        await expectEverywhere(t.peers, expected);
      });
    }
  }

  // Lane seed 115: an entity grown over the next node (set whole, the node
  // removed), then Backspace over what it took.
  class TagNode extends TextNode {
    $config() {
      return this.config('regression-tag', {extends: TextNode});
    }
  }
  for (const ids of IDS) {
    test(`R20A-1 an entity grown over the next node, then Backspace (ids ${ids}); the peer deletes its first character`, async () => {
      const nodes = [...NODES, TagNode];
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $create(TagNode).setTextContent(' ab '),
              $createTextNode('😀').toggleFormat('bold'),
            ),
          );
        },
        {ids, nodes},
      );
      t.offline();
      t.a.update(() => {
        const [tag, next] = $line().getChildren() as TextNode[];
        tag.setTextContent(' ab 😀');
        next.remove();
        tag.select(4, 6).removeText();
        $setSelection(null);
      });
      t.b.update(() => {
        ($line().getFirstChild() as TextNode).spliceText(0, 1, '', false);
        $setSelection(null);
      });
      await t.sync();
      const fresh = await freshReader(t.a, nodes);
      expect([...t.peers, fresh].map(lineText)).toEqual(['ab ', 'ab ', 'ab ']);
      await expectConverged(t.peers);
      fresh.stop();
    });
  }
});

// R20A-2: a node set whole, and a node made next to it in the same update
// whose text equals the set node's old start (or end): the made text took
// those old characters, so the set node's were written anew and a peer's
// concurrent delete there came back (lane seed 2335).
// Text a node made holds takes no old characters from set text.
describe('R20A-2: a node made next to a node set whole, with a copy of its old start or end', () => {
  for (const [name, old, next, made, before, bold, from, to, expected] of [
    [
      'a copy of its start before, bold',
      'ab',
      'abX',
      'ab',
      true,
      true,
      1,
      2,
      'abaX',
    ],
    [
      'a copy of its end after, bold',
      'ab',
      'Xab',
      'ab',
      false,
      true,
      0,
      1,
      'Xbab',
    ],
    [
      'a copy of its start before, plain (merged)',
      'ab',
      'abX',
      'ab',
      true,
      false,
      1,
      2,
      'abaX',
    ],
    [
      'a copy of its first word before',
      'one two',
      'one two three',
      'one ',
      true,
      true,
      1,
      2,
      'one oe two three',
    ],
    [
      'a copy of its last word after',
      'one two',
      'zero one two',
      ' two',
      false,
      true,
      5,
      6,
      'zero one to two',
    ],
    [
      'lane seed 2335: prepended to, a copy of its first word before',
      'la la la ',
      'Xla la la ',
      'la',
      true,
      true,
      0,
      1,
      'laXa la la ',
    ],
    [
      'appended to, a copy of its last word after',
      'la la la',
      'la la laX',
      'la',
      false,
      true,
      7,
      8,
      'la la lXla',
    ],
    [
      'control: other text made before',
      'one two',
      'one two three',
      'NEW ',
      true,
      true,
      1,
      2,
      'NEW oe two three',
    ],
  ] as const) {
    test(`R20A-2 ${name}; the peer deletes an old character`, async () => {
      const t = await setup(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Title')),
          $createParagraphNode().append($createTextNode(old)),
        );
      });
      t.offline();
      t.a.update(() => {
        $setSelection(null);
        const node = $line().getFirstChild() as TextNode;
        node.setTextContent(next);
        const copy = $createTextNode(made);
        if (bold) {
          copy.toggleFormat('bold');
        }
        if (before) {
          node.insertBefore(copy);
        } else {
          node.insertAfter(copy);
        }
      });
      t.b.update(() => {
        ($line().getFirstChild() as TextNode).select(from, to).removeText();
        $setSelection(null);
      });
      await t.sync();
      await expectEverywhere(t.peers, expected);
    });
  }
});

// R21B-F1: text moved from two removed neighbours into a node set whole.
// "head " | _x_ | **y** | ~~z~~ | " tail": without a caret, set the italic
// node to x + y + z, remove both neighbours, and (but for the controls) make
// a bold "Q " after or before it. The text of the first removed neighbour was
// kept and that of the second written anew, so a peer's concurrent delete of
// its first character came back. Only "Q " is new.
describe('R21B-F1: two removed neighbours moved into a node set whole', () => {
  const TRIPLES = [
    ['ab', 'cd', 'ef'],
    ['one ', 'two ', 'six'],
    ['x', 'yy', 'zzz'],
  ] as const;
  for (const [x, y, z] of TRIPLES) {
    for (const made of ['after', 'before', 'none'] as const) {
      for (const ids of IDS) {
        const q = made === 'none' ? '' : 'Q ';
        const expected = `head ${made === 'before' ? q : ''}${x}${y}${z.slice(
          1,
        )}${made === 'after' ? q : ''} tail`;
        test(`R21B-F1 "${x}" + "${y}" + "${z}", made ${made} (ids ${ids}); the peer deletes the second neighbour's first character`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $createTextNode('head ').toggleFormat('underline'),
                  $createTextNode(x).toggleFormat('italic'),
                  $createTextNode(y).toggleFormat('bold'),
                  $createTextNode(z).toggleFormat('strikethrough'),
                  $createTextNode(' tail').toggleFormat('underline'),
                ),
              );
            },
            {ids},
          );
          const w = track(t.a.doc);
          t.offline();
          t.a.update(() => {
            const set = $line().getChildAtIndex(1) as TextNode;
            set.setTextContent(x + y + z);
            ($line().getChildAtIndex(3) as TextNode).remove();
            ($line().getChildAtIndex(2) as TextNode).remove();
            if (made !== 'none') {
              const node = $createTextNode(q).toggleFormat('bold');
              if (made === 'before') {
                set.insertBefore(node);
              } else {
                set.insertAfter(node);
              }
            }
            $setSelection(null);
          });
          expect(w).toEqual({del: '', ins: q});
          t.b.update(() => {
            ($line().getChildAtIndex(3) as TextNode).spliceText(
              0,
              1,
              '',
              false,
            );
            $setSelection(null);
          });
          await t.sync();
          await expectEverywhere(t.peers, expected);
        });
      }
    }
  }
});

// R21A-1: a node swapped for one with the same text, and a node made in the
// same stretch. An entity transform grows a stale entity over its
// neighbour (a set, the neighbour removed) and makes it plain again (a node
// made with that text), next to a node made by the update; or app code
// replaces a node with one of the same text. The swapped text was written
// anew, so a peer's concurrent delete in it came back (lane seed 3830; round
// 11 kept it).
describe('R21A-1: a node swap and a node made in one update', () => {
  class EntityNode extends TextNode {
    $config() {
      return this.config('regression-entity', {extends: TextNode});
    }
    isTextEntity(): true {
      return true;
    }
  }
  const $entity = (text: string) => $create(EntityNode).setTextContent(text);
  const nodes = [...NODES, EntityNode];
  const WORD = /(^|\s)(ab)(?=\s|$)/;
  const registerEntity = (editor: LexicalEditor) => {
    const stops = registerLexicalTextEntity(
      editor,
      (text: string) => {
        const m = WORD.exec(text);
        if (m === null) {
          return null;
        }
        const start = m.index + m[1].length;
        return {end: start + m[2].length, start};
      },
      EntityNode,
      node => $entity(node.getTextContent()),
    );
    return () => stops.forEach(stop => stop());
  };
  const $find = (bold: boolean) =>
    $line()
      .getChildren()
      .find(
        n =>
          $isTextNode(n) &&
          n.getType() === 'text' &&
          n.hasFormat('bold') === bold,
      ) as TextNode;
  const $deleteAt = (from: number, to: number) => {
    let pos = 0;
    const sel = $createRangeSelection();
    for (const node of $line().getAllTextNodes()) {
      const n = node.getTextContentSize();
      if (from >= pos && from < pos + n) {
        sel.anchor.set(node.getKey(), from - pos, 'text');
      }
      if (to > pos && to <= pos + n) {
        sel.focus.set(node.getKey(), to - pos, 'text');
      }
      pos += n;
    }
    $setSelection(sel);
    sel.removeText();
    $setSelection(null);
  };
  const $stale = () => [
    $entity('é中 '),
    $createTextNode('a aab ab'),
    $createTextNode('abab ').toggleFormat('bold'),
  ];
  const $plain = () => [
    $createTextNode('abc def'),
    $createTextNode('xyz').toggleFormat('bold'),
  ];
  for (const [name, entity, init, edit, from, to, expected] of [
    [
      'an entity made plain next to a made copy (lane seed 3830)',
      true,
      $stale,
      () =>
        $find(true).insertBefore($createTextNode('abab ').toggleFormat('bold')),
      5,
      6,
      'é中 a ab ababab abab ',
    ],
    [
      'an entity made plain next to a made "NEW "',
      true,
      $stale,
      () =>
        $find(true).insertBefore($createTextNode('NEW ').toggleFormat('bold')),
      5,
      6,
      'é中 a ab abNEW abab ',
    ],
    [
      'an entity made plain, a made node merged into it',
      true,
      $stale,
      () => $find(false).insertAfter($createTextNode(' Q')),
      5,
      6,
      'é中 a ab ab Qabab ',
    ],
    [
      'app code replaces a node, a made node merged into the next',
      false,
      $plain,
      () => {
        const plain = $find(false);
        plain.replace($entity(plain.getTextContent()));
        $find(true).insertBefore($createTextNode('NEW').toggleFormat('bold'));
      },
      1,
      2,
      'ac defNEWxyz',
    ],
    [
      'app code replaces a node, a node made after it',
      false,
      $plain,
      () => {
        const plain = $find(false);
        const swapped = $entity(plain.getTextContent());
        plain.replace(swapped);
        swapped.insertAfter($createTextNode('NEW'));
      },
      1,
      2,
      'ac defNEWxyz',
    ],
  ] as const) {
    for (const ids of IDS) {
      test(`R21A-1 ${name} (ids ${ids}); the peer deletes an old character`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(...init()),
            );
          },
          {ids, nodes},
        );
        const stops = entity ? t.peers.map(p => registerEntity(p.editor)) : [];
        if (entity) {
          t.peers.forEach(p => p.update(() => {}));
          await t.sync();
        }
        t.offline();
        t.a.update(() => {
          $setSelection(null);
          edit();
        });
        t.b.update(() => $deleteAt(from, to));
        await t.sync();
        await t.sync();
        const fresh = await freshReader(t.a, nodes);
        expect([...t.peers, fresh].map(lineText)).toEqual(
          [...t.peers, fresh].map(() => expected),
        );
        await expectConverged(t.peers);
        stops.forEach(stop => stop());
        fresh.stop();
      });
    }
  }
});

// R21A-2: in one update, a text set whole, a caret edit inside the text just
// set, and the text set whole again (app code, or a transform reacting to
// the edit). Where the deleted set text was is lost with the second set, so
// the node's old text was written anew and a peer's concurrent delete in it
// came back (lane seeds 1747 and 2607). The first set is
// resolved before the second replaces its text (see TextReplay#compose).
describe('R21A-2: a text set, edited and set again in one update', () => {
  const $node = () => $line().getFirstChild() as TextNode;
  const $replace = (from: number, to: number, text: string) => {
    const sel = $createRangeSelection();
    sel.anchor.set($node().getKey(), from, 'text');
    sel.focus.set($node().getKey(), to, 'text');
    $setSelection(sel);
    if (text === '') {
      sel.removeText();
    } else {
      sel.insertText(text);
    }
  };
  for (const [name, edit, expected] of [
    [
      'set, type over the set text, set again',
      () => {
        $node().setTextContent('ab cd ef gh');
        $replace(7, 9, 'X');
        $node().setTextContent($node().getTextContent() + '!');
      },
      'a cd e!Xgh',
    ],
    [
      'control: set, Backspace in the set text',
      () => {
        $node().setTextContent('ab cd ef');
        $replace(7, 8, '');
      },
      'a cd e',
    ],
  ] as const) {
    for (const ids of IDS) {
      test(`R21A-2 ${name} (ids ${ids}); the peer deletes "b"`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append($createTextNode('ab cd')),
            );
          },
          {ids},
        );
        t.offline();
        t.a.update(() => {
          $setSelection(null);
          edit();
          $setSelection(null);
        });
        t.b.update(() => {
          $replace(1, 2, '');
          $setSelection(null);
        });
        await t.sync();
        await t.sync();
        await expectEverywhere(t.peers, expected);
      });
    }
  }
});

// Text entity transforms (registerLexicalTextEntity) record what they do with
// the characters they touch: an entity grown over the start of the next node
// takes those characters (a move), and an entity made plain text again, or
// plain text made an entity, holds the same characters in a node of another
// type (a retype). Before, the record had only the text sets and the nodes
// removed and made, so the binding aligned the text, and a remake next to a
// node app code removed, or a paste, could take other characters.
describe('Text entity edits: grows and remakes keep their characters', () => {
  class TagNode extends TextNode {
    $config() {
      return this.config('regression-entity-tag', {extends: TextNode});
    }
    isTextEntity(): true {
      return true;
    }
  }
  class KeywordNode extends TextNode {
    $config() {
      return this.config('regression-entity-keyword', {extends: TextNode});
    }
    canInsertTextBefore(): boolean {
      return false;
    }
    canInsertTextAfter(): boolean {
      return false;
    }
    isTextEntity(): true {
      return true;
    }
  }
  const nodes = [...NODES, TagNode, KeywordNode, HashtagNode];
  const word = (re: RegExp) => (text: string) => {
    const m = re.exec(text);
    if (m === null) {
      return null;
    }
    const start = m.index + m[1].length;
    return {end: start + m[2].length, start};
  };
  // The R19-A lane's entities: the word "la" a keyword, the word "ab" a tag.
  const registerEntities = (editor: LexicalEditor) => {
    const stops = [
      ...registerLexicalTextEntity(
        editor,
        word(/(^|\s)(la)(?=\s|$)/),
        KeywordNode,
        n => $create(KeywordNode).setTextContent(n.getTextContent()),
      ),
      ...registerLexicalTextEntity(
        editor,
        word(/(^|\s)(ab)(?=\s|$)/),
        TagNode,
        n => $create(TagNode).setTextContent(n.getTextContent()),
      ),
    ];
    return () => stops.forEach(stop => stop());
  };
  /** Select line offsets `from` to `to`. */
  const $select = (from: number, to: number) => {
    const sel = $createRangeSelection();
    let pos = 0;
    let anchored = false;
    for (const node of $line().getAllTextNodes()) {
      const n = node.getTextContentSize();
      if (!anchored && from >= pos && (from < pos + n || from === to)) {
        sel.anchor.set(node.getKey(), from - pos, 'text');
        anchored = true;
      }
      if (to > pos && to <= pos + n) {
        sel.focus.set(node.getKey(), to - pos, 'text');
      }
      pos += n;
    }
    $setSelection(sel);
    return sel;
  };
  /**
   * The line's text once the peer deleted old character `at`, where `chars`
   * are the author's line, each with its old offset (-1: new).
   */
  const without = (chars: [string, number][], at: number) =>
    chars
      .filter(([, i]) => i !== at)
      .map(([c]) => c)
      .join('');
  const charsOf = (text: string): [string, number][] =>
    text.split('').map((c, i) => [c, i]);
  const made = (text: string): [string, number][] =>
    text.split('').map(c => [c, -1]);

  // R19A-5383 (lane seed 5383): stale tags "la " and " ab " after a
  // plain "la". Without a caret, app code removes the plain "la" (its record
  // says only that the node left, not that it was deleted), and in the same
  // update the transforms make the tags plain text and then a keyword "la" and
  // a tag "ab", each by copying the text into a new node. The keyword took the
  // removed node's characters, so a peer's concurrent delete in the old tag's
  // "la" was lost.
  describe('R19A-5383: app code removes a node next to entities the transforms remake', () => {
    for (const [name, at] of [
      ['the "l" of the remade tag', 2],
      ['the "a" of the remade tag', 3],
      ['control: the "a" of the other tag', 6],
    ] as const) {
      for (const ids of IDS) {
        test(`R19A-5383 the peer deletes ${name} (ids ${ids})`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $createTextNode('la'),
                  $create(TagNode).setTextContent('la '),
                  $create(TagNode).setTextContent(' ab '),
                ),
              );
            },
            {ids, nodes},
          );
          const chars = charsOf(lineText(t.a)).slice(2);
          // Registered now, the transforms run over the tags in the next
          // update.
          const stop = registerEntities(t.a.editor);
          t.offline();
          t.a.update(() => {
            $setSelection(null);
            $line().getFirstChildOrThrow().remove();
          });
          expect(t.a.describe()).toBe(
            'paragraph("Title") / paragraph("la" "  " "ab" " ")',
          );
          t.b.update(() => {
            $select(at, at + 1).removeText();
            $setSelection(null);
          });
          await t.sync();
          await t.sync();
          const fresh = await freshReader(t.a, nodes);
          const expected = without(chars, at);
          expect([...t.peers, fresh].map(lineText)).toEqual(
            [...t.peers, fresh].map(() => expected),
          );
          await expectConverged(t.peers);
          stop();
          fresh.stop();
        });
      }
    }
  });

  // R19A-4590 (lane seed 4590): stale tags "la" | "la" | bold "laa a". In one
  // update the author pastes "la " over the first tag's "a", and app code
  // grows the second tag over the bold text (sets its text, removes the bold
  // node); the transforms make both tags plain text. The pasted "la " took
  // the second tag's characters, so a peer's concurrent delete there landed
  // on the pasted text. The bold text that app code
  // moved into the tag is placed by the line's diff (the grow is app code's
  // own), which keeps it here.
  describe('R19A-4590: a paste and an app-code grow next to entities the transforms remake', () => {
    for (const [name, at] of [
      ['control: the "l" of the first tag', 0],
      ['the "l" of the second tag', 2],
      ['the "a" of the second tag', 3],
      ['the "l" app code moved', 4],
      ['the "a" app code moved', 5],
    ] as const) {
      for (const ids of IDS) {
        test(`R19A-4590 the peer deletes ${name} (ids ${ids})`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $create(TagNode).setTextContent('la'),
                  $create(TagNode).setTextContent('la'),
                  $createTextNode('laa a').toggleFormat('bold'),
                ),
              );
            },
            {ids, nodes},
          );
          const chars = charsOf(lineText(t.a));
          chars.splice(1, 1, ...made('la '));
          const stop = registerEntities(t.a.editor);
          t.offline();
          t.a.update(() => {
            $select(1, 2).insertNodes([$createTextNode('la ')]);
            const tag = $line()
              .getChildren()
              .filter((n): n is TagNode => n instanceof TagNode)
              .pop()!;
            const next = tag.getNextSibling() as TextNode;
            tag.setTextContent(tag.getTextContent() + next.getTextContent());
            next.remove();
            $setSelection(null);
          });
          expect(lineText(t.a)).toBe('lla lalaa a');
          t.b.update(() => {
            $select(at, at + 1).removeText();
            $setSelection(null);
          });
          await t.sync();
          await t.sync();
          const fresh = await freshReader(t.a, nodes);
          const expected = without(chars, at);
          expect([...t.peers, fresh].map(lineText)).toEqual(
            [...t.peers, fresh].map(() => expected),
          );
          await expectConverged(t.peers);
          stop();
          fresh.stop();
        });
      }
    }
  });

  // A move out of a node whose text was set whole and then edited earlier in
  // the same update ("aa" set to "Xaa", its first "a" deleted, "X" moved into
  // "#foo"), then one of the two nodes set again. The text that left that
  // node is aligned with the text that arrived there; moving part of what it
  // holds would split them, and the deleted "a" came back for another
  // character, so a peer's concurrent delete of it removed that one. Such a
  // move is replayed as the two text sets it stands for.
  describe('a move out of a node set and edited earlier in the update', () => {
    for (const [name, text, at, setTo, expected] of [
      ['then the node it moved to set', 'aa', 1, '#fooXa', '#fooXaa'],
      ['then the node it left set', 'abc', 2, 'abc', '#fooXabc'],
    ] as const) {
      for (const ids of IDS) {
        test(`${name} (ids ${ids}): the peer deletes a character the author deleted`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $createTextNode('#foo').toggleFormat('bold'),
                  $createTextNode(text),
                ),
              );
            },
            {ids},
          );
          t.offline();
          t.a.update(() => {
            const [to, from] = $line().getAllTextNodes();
            from.setTextContent('X' + text);
            from.spliceText(at, 1, '', false);
            const fromText = from.getTextContent();
            INTERNAL_$recordTextMove(from, to, 1, () => {
              to.setTextContent(to.getTextContent() + 'X');
              from.setTextContent(fromText.slice(1));
            });
            (setTo.startsWith('#') ? to : from).setTextContent(setTo);
            $setSelection(null);
          });
          expect(lineText(t.a)).toBe(expected);
          t.b.update(() => {
            ($line().getChildAtIndex(1) as TextNode).spliceText(
              at - 1,
              1,
              '',
              false,
            );
            $setSelection(null);
          });
          await t.sync();
          await expectEverywhere(t.peers, expected);
        });
      }
    }
  });

  // Both nodes set earlier in the update ("#foo" to "#fooQ"; "aa" to "Xaa"
  // and its first "a" deleted), all of what is left moved, and then the node
  // it moved to merged into the one before, made segmented and split, or
  // remade as plain text: no node is set again, so the move keeps its
  // characters, and a peer's concurrent delete of the second "a" applies.
  for (const then of ['merge', 'segmented split', 'remake'] as const) {
    for (const ids of IDS) {
      test(`a move of all of a node set and edited earlier in the update, then a ${then} (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(
                $createTextNode('head ').toggleFormat('underline'),
                $createTextNode('#foo').toggleFormat('bold'),
                $createTextNode('aa'),
              ),
            );
          },
          {ids},
        );
        t.offline();
        t.a.update(() => {
          const [head, to, from] = $line().getAllTextNodes();
          to.setTextContent('#fooQ');
          from.setTextContent('Xaa');
          from.spliceText(1, 1, '', false);
          INTERNAL_$recordTextMove(from, to, 2, () => {
            to.setTextContent('#fooQXa');
            from.remove();
          });
          if (then === 'merge') {
            // (mergeWithSibling compares nodes as they are now.)
            head.getLatest().mergeWithSibling(to.getLatest());
          } else if (then === 'segmented split') {
            to.setMode('segmented').splitText(6);
          } else {
            const plain = $createTextNode(to.getTextContent());
            to.replace(plain);
            INTERNAL_$recordTextRetype(to, plain);
          }
          $setSelection(null);
        });
        expect(lineText(t.a)).toBe('head #fooQXa');
        t.b.update(() => {
          ($line().getChildAtIndex(2) as TextNode).spliceText(1, 1, '', false);
          $setSelection(null);
        });
        await t.sync();
        await expectEverywhere(t.peers, 'head #fooQX');
      });
    }
  }

  // The same inside a link: all of what is left moved into "#fooQ", which
  // is split after "#fooQX" and that part removed; the link is then remade
  // as plain text holding the "a" left. A peer's concurrent delete of that
  // "a" applies.
  for (const ids of IDS) {
    test(`a move inside a link, part of where it moved removed, then the link remade (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createTextNode('head ').toggleFormat('underline'),
              $createLinkNode('/').append(
                $create(HashtagNode).setTextContent('#foo'),
                $createTextNode('aa'),
              ),
            ),
          );
        },
        {ids, nodes},
      );
      t.offline();
      t.a.update(() => {
        const link = $line().getChildAtIndex(1) as LinkNode;
        const [to, from] = link.getAllTextNodes();
        to.setTextContent('#fooQ');
        from.setTextContent('Xaa');
        from.spliceText(1, 1, '', false);
        INTERNAL_$recordTextMove(from, to, 2, () => {
          to.setTextContent('#fooQXa');
          from.remove();
        });
        to.getLatest().splitText(6);
        to.getLatest().remove();
        link.replace($createTextNode(link.getTextContent()));
        $setSelection(null);
      });
      expect(lineText(t.a)).toBe('head a');
      t.b.update(() => {
        const link = $line().getChildAtIndex(1) as LinkNode;
        (link.getChildAtIndex(1) as TextNode).spliceText(1, 1, '', false);
        $setSelection(null);
      });
      await t.sync();
      await expectEverywhere(t.peers, 'head ');
    });
  }

  // "abc" set to "Xabc" and its "b" deleted; "X" moved into "#foo", which is
  // then set to "#fooabc", and the rest put before it. The set reaches the
  // history the move split, so the move is text sets: the new "b" is not the
  // deleted one, and a peer's concurrent delete of that one changes nothing.
  for (const ids of IDS) {
    test(`a move, then the node it moved to set and the rest put before it (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createTextNode('head ').toggleFormat('underline'),
              $create(HashtagNode).setTextContent('#foo').toggleFormat('bold'),
              $createTextNode('abc'),
            ),
          );
        },
        {ids, nodes},
      );
      t.offline();
      t.a.update(() => {
        const [, to, from] = $line().getAllTextNodes();
        from.setTextContent('Xabc');
        from.spliceText(2, 1, '', false);
        INTERNAL_$recordTextMove(from, to, 1, () => {
          to.setTextContent('#fooX');
          from.setTextContent('ac');
        });
        to.setTextContent('#fooabc');
        to.getLatest().insertBefore(from.getLatest());
        $setSelection(null);
      });
      expect(lineText(t.a)).toBe('head ac#fooabc');
      t.b.update(() => {
        ($line().getChildAtIndex(2) as TextNode).spliceText(1, 1, '', false);
        $setSelection(null);
      });
      await t.sync();
      await expectEverywhere(t.peers, 'head ac#fooabc');
    });
  }

  // "head " set to "head Q", "aa" to "Xaa" and its first "a" deleted; "X"
  // moved into "#foo", all of "#fooX" moved into "head Q", which is then set
  // again: the second move's text sets reach what the first one split, so
  // both are text sets, and a peer's concurrent delete of the second "a"
  // applies.
  for (const ids of IDS) {
    test(`a move, a move of all of its destination, then that node set again (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createTextNode('head ').toggleFormat('underline'),
              $createTextNode('#foo').toggleFormat('bold'),
              $createTextNode('aa'),
            ),
          );
        },
        {ids},
      );
      t.offline();
      t.a.update(() => {
        const [head, tag, plain] = $line().getAllTextNodes();
        head.setTextContent('head Q');
        plain.setTextContent('Xaa');
        plain.spliceText(1, 1, '', false);
        INTERNAL_$recordTextMove(plain, tag, 1, () => {
          tag.setTextContent('#fooX');
          plain.setTextContent('a');
        });
        INTERNAL_$recordTextMove(tag, head, 5, () => {
          head.setTextContent('head Q#fooX');
          tag.remove();
        });
        head.setTextContent('head Q#fooXa');
        $setSelection(null);
      });
      expect(lineText(t.a)).toBe('head Q#fooXaa');
      t.b.update(() => {
        ($line().getChildAtIndex(2) as TextNode).spliceText(1, 1, '', false);
        $setSelection(null);
      });
      await t.sync();
      await expectEverywhere(t.peers, 'head Q#fooXa');
    });
  }

  // The same through the hashtag plugin: " abc" set to "X abc" and its "b"
  // deleted; the hashtag grows over "X", and an app transform puts a new "b"
  // back (" ac" set to " abc"). A peer's concurrent delete of the old "b"
  // must not remove the new one.
  for (const ids of IDS) {
    test(`a hashtag grown over text set and edited earlier in the update, then that text set again (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $create(HashtagNode).setTextContent('#foo'),
              $createTextNode(' abc'),
            ),
          );
        },
        {ids, nodes},
      );
      const stopHashtag = registerLexicalHashtag(t.a.editor);
      const stopRestore = t.a.editor.registerNodeTransform(TextNode, node => {
        if (node.isSimpleText() && node.getTextContent() === ' ac') {
          node.setTextContent(' abc');
        }
      });
      t.offline();
      t.a.update(() => {
        const plain = $line().getChildAtIndex(1) as TextNode;
        plain.setTextContent('X abc');
        plain.spliceText(3, 1, '', false);
        $setSelection(null);
      });
      // (The author's own edit only, not the reads of the peer's.)
      stopRestore();
      expect(t.a.describe()).toBe(
        'paragraph("Title") / paragraph("#fooX" " abc")',
      );
      t.b.update(() => {
        ($line().getChildAtIndex(1) as TextNode).spliceText(2, 1, '', false);
        $setSelection(null);
      });
      await t.sync();
      await t.sync();
      const fresh = await freshReader(t.a, nodes);
      expect([...t.peers, fresh].map(lineText)).toEqual([
        '#fooX abc',
        '#fooX abc',
        '#fooX abc',
      ]);
      await expectConverged(t.peers);
      stopHashtag();
      fresh.stop();
    });
  }

  // A hashtag grown over the next word (deleting the space after it): the
  // author's write deletes only the space, and a peer's concurrent delete in
  // the moved "bar" applies there.
  describe('a hashtag grown over the next word', () => {
    for (const ids of IDS) {
      test(`the peer deletes the moved "r" (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(
                $createTextNode('say '),
                $create(HashtagNode).setTextContent('#foo'),
                $createTextNode(' bar baz'),
              ),
            );
          },
          {ids, nodes},
        );
        const stops = t.peers.map(p => registerLexicalHashtag(p.editor));
        const w = track(t.a.doc);
        t.offline();
        t.a.update(() => {
          $select(8, 9).removeText();
        });
        expect(t.a.describe()).toBe(
          'paragraph("Title") / paragraph("say " "#foobar" " baz")',
        );
        expect(w).toEqual({del: ' ', ins: ''});
        t.b.update(() => {
          $select(11, 12).removeText();
          $setSelection(null);
        });
        await t.sync();
        await t.sync();
        await expectEverywhere(t.peers, 'say #fooba baz');
        stops.forEach(stop => stop());
      });
    }
  });
});

// S6-5: Enter inside a highlighted code token that the highlighter makes
// again in tokens of other types (a comment line, a string, an identifier):
// the split's tail is removed and its text made again after the new line
// break, the same characters in the same place. The common start of the
// text that arrived (the line break first) met the tail and deleted it, so
// the tail was written as a delete and an insert, and a peer's concurrent
// delete in it came back.
describe('S6-5: Enter inside a code token the highlighter makes again', () => {
  function codePeer(id: number) {
    const doc = createYDoc();
    doc.clientID = id;
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        dependencies: [
          CodePrismExtension,
          configExtension(YCollabExtension, {doc, schemaVersion: 1}),
        ],
        name: `s6-5/${id}`,
        onError: (e: Error) => {
          throw e;
        },
      }),
    );
    const {binding} = getExtensionDependencyFromEditor(
      editor,
      YCollabExtension,
    ).output;
    const written = {deleted: '', inserted: ''};
    doc.on('afterTransaction', (tr: Y.Transaction) => {
      if (!tr.local) {
        return;
      }
      Y.iterateStructsByIdSet(tr, tr.insertSet, s => {
        if (s instanceof Y.Item && s.content instanceof Y.ContentString) {
          written.inserted += s.content.str;
        }
      });
      Y.iterateStructsByIdSet(tr, tr.deleteSet, s => {
        if (s instanceof Y.Item && s.content instanceof Y.ContentString) {
          written.deleted += s.content.str;
        }
      });
    });
    return {binding, doc, editor, written};
  }
  type CodePeer = ReturnType<typeof codePeer>;
  const exchange = (a: CodePeer, b: CodePeer) => {
    Y.applyUpdate(
      b.doc,
      Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc)),
    );
    Y.applyUpdate(
      a.doc,
      Y.encodeStateAsUpdate(b.doc, Y.encodeStateVector(a.doc)),
    );
    a.editor.read(() => 0);
    b.editor.read(() => 0);
  };
  const codeText = (p: CodePeer) =>
    p.editor.getEditorState().read(() => {
      const code = $getRoot().getChildren().find($isCodeNode);
      return code ? code.getTextContent() : '';
    });
  for (const [line, at] of [
    ['// TODO: qd_1611z remove the fallback', 3],
    ['const x = fetchItems(limit); // remove y', 15],
    ['let s = "abc remove def";', 12],
    ['TODO: qd_1611z remove the fallback', 0],
  ] as const) {
    test(`Enter in ${JSON.stringify(line)} at ${at} writes a line break alone; a concurrent delete holds`, () => {
      const a = codePeer(1);
      const b = codePeer(2);
      a.editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createCodeNode('javascript').append($createTextNode(line)),
            );
        },
        {discrete: true},
      );
      a.binding.initialize();
      exchange(a, b);
      b.binding.initialize();
      a.written.deleted = '';
      a.written.inserted = '';
      a.editor.update(
        () => {
          const code = $getRoot().getChildren().find($isCodeNode)!;
          let n = 0;
          for (const c of code.getChildren()) {
            const len = c.getTextContentSize();
            if ($isTextNode(c) && at <= n + len) {
              c.select(at - n, at - n);
              break;
            }
            n += len;
          }
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertParagraph();
          }
        },
        {discrete: true},
      );
      const written = {...a.written};
      b.editor.update(
        () => {
          const code = $getRoot().getChildren().find($isCodeNode)!;
          for (const t of code.getAllTextNodes()) {
            const i = t.getTextContent().indexOf('remove ');
            if (i >= 0) {
              t.spliceText(i, 'remove '.length, '', false);
              return;
            }
          }
          throw new Error('no "remove " in one node');
        },
        {discrete: true},
      );
      exchange(a, b);
      const expected =
        line.slice(0, at) + '\n' + line.slice(at).replace('remove ', '');
      expect({a: codeText(a), b: codeText(b), ...written}).toEqual({
        a: expected,
        b: expected,
        deleted: '',
        inserted: '\n',
      });
      a.editor.dispose();
      b.editor.dispose();
    });
  }
});

// S7-39: a line's children made again as one plain node with one word
// changed (an agent's rewrite of the block), where a node that held the
// changed word was deleted whole (a removed node's text was aligned whole or
// not at all). The check that keeps only what both diffs keep read the text
// that left without that node, so the characters on its two sides (or the
// last characters before it and the end of the line) were next to each
// other, and it took the end of the word before as possibly a part of the
// new word: the rewrite wrote it again, and a peer's concurrent edit of the
// changed word landed inside the word before ("t16t83zz t80z  t19z"). The
// node that held the word now keeps its other characters too (S9-7).
describe('S7-39: a line made again as one node, where a node that held the changed word went whole', () => {
  // The line's text nodes (italic or not), the word changed and its new
  // text, and what the rewrite deletes and inserts.
  const cases: [[string, boolean][], string, string, string, string][] = [
    [
      [
        ['t16z ', false],
        ['t63z ', true],
        [' t19z', false],
      ],
      't63z',
      't80z',
      't63z',
      't80z',
    ],
    [
      [
        ['ab ', false],
        ['cd ', true],
        [' ef', false],
      ],
      'cd',
      'gh',
      'cd',
      'gh',
    ],
    [
      [
        ['t58z t59z', true],
        [' t60z t61z', false],
      ],
      't60z',
      't70z',
      't60z',
      't70z',
    ],
  ];
  for (const [nodes, word, next, del, ins] of cases) {
    const shown = nodes
      .map(([text, italic]) => (italic ? `_"${text}"_` : `"${text}"`))
      .join(' | ');
    for (const ids of IDS) {
      test(`${shown} made again with "${next}" ‖ a peer replaces "${word}" (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(
                ...nodes.map(([text, italic]) =>
                  italic
                    ? $createTextNode(text).toggleFormat('italic')
                    : $createTextNode(text),
                ),
              ),
            );
          },
          {ids},
        );
        const writes = track(t.a.doc);
        t.offline();
        t.a.update(() => {
          const line = $line();
          const text = line.getTextContent().replace(word, next);
          for (const child of line.getChildren()) {
            child.remove();
          }
          line.append($createTextNode(text));
          $setSelection(null);
        });
        t.b.update(() => {
          for (const node of $line().getChildren()) {
            const at = node.getTextContent().indexOf(word);
            if ($isTextNode(node) && at >= 0) {
              node.spliceText(at, word.length, 'XY', false);
              break;
            }
          }
          $setSelection(null);
        });
        // The rewrite writes only the word, and keeps every other
        // character of the line.
        expect(writes).toEqual({del, ins});
        await t.sync();
        // The text of the nodes before the one that held the word stays
        // whole, on every client.
        const start = nodes
          .slice(
            0,
            nodes.findIndex(([text]) => text.includes(word)),
          )
          .map(([text]) => text)
          .join('');
        const fresh = await freshReader(t.a);
        for (const p of [...t.peers, fresh]) {
          expect(lineText(p).startsWith(start)).toBe(true);
        }
        await expectConverged(t.peers);
      });
    }
  }
});

// S9-7 (#9556): a line's text nodes made again with other text, as an
// agent's rewrite of a block from its JSON with one word changed does. A
// removed node's text was aligned with what replaced it whole or not at
// all, so the rewrite wrote the line again: a collaborator's letter typed
// concurrently into an unchanged word stayed in front of the rewritten
// line, and a collaborator's concurrent delete there came back. The text of
// the node made in their place keeps the words they shared.
describe('S9-7: a line made again with one word changed keeps its other words', () => {
  // The line's text nodes (bold or not), the word changed and its new text,
  // where the peer edits (a text node, and offsets in it), and the line
  // after the peer types "Q" at the first offset, or deletes the character
  // at the second.
  const cases: [
    string,
    [string, boolean][],
    string,
    string,
    [number, number, number],
    string,
    string,
  ][] = [
    [
      'one node',
      [['t63 t71z t13z t69z t15z', false]],
      't69z',
      't81z',
      [0, 3, 5],
      't63Q t71z t13z t81z t15z',
      't63 t1z t13z t81z t15z',
    ],
    [
      'three nodes, the word in a bold one',
      [
        ['t12z ', false],
        ['t13z t69z', true],
        [' t15z', false],
      ],
      't69z',
      't81z',
      [1, 2, 2],
      't12z t1Q3z t81z t15z',
      't12z t1z t81z t15z',
    ],
  ];
  for (const [
    name,
    nodes,
    word,
    next,
    [node, at, del],
    typed,
    deleted,
  ] of cases) {
    for (const edit of ['types', 'deletes'] as const) {
      for (const ids of IDS) {
        test(`S9-7 ${name}: the peer ${edit} in an unchanged word (ids ${ids})`, async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  ...nodes.map(([text, bold]) =>
                    bold
                      ? $createTextNode(text).toggleFormat('bold')
                      : $createTextNode(text),
                  ),
                ),
              );
            },
            {ids},
          );
          const writes = track(t.a.doc);
          t.offline();
          t.a.update(() => {
            const line = $line();
            const text = line.getTextContent().replace(word, next);
            for (const child of line.getChildren()) {
              child.remove();
            }
            line.append($createTextNode(text));
            $setSelection(null);
          });
          const written = {...writes};
          t.b.update(() => {
            const text = $line().getAllTextNodes()[node];
            if (edit === 'types') {
              text.spliceText(at, 0, 'Q', false);
            } else {
              text.spliceText(del, 1, '', false);
            }
            $setSelection(null);
          });
          await t.sync();
          await expectEverywhere(t.peers, edit === 'types' ? typed : deleted);
          expect(written).toEqual({del: word, ins: next});
        });
      }
    }
  }

  // A removed node that shares no text with the node made in its place is
  // deleted, and the text after it is still kept: "xyz " goes, "one two" is
  // kept and " X" is new.
  for (const ids of IDS) {
    test(`S9-7 a removed node with none of the new text before one with all of it: the peer deletes "n" (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createTextNode('xyz ').toggleFormat('bold'),
              $createTextNode('one two'),
            ),
          );
        },
        {ids},
      );
      const writes = track(t.a.doc);
      t.offline();
      t.a.update(() => {
        for (const child of $line().getChildren()) {
          child.remove();
        }
        $line().append($createTextNode('one two X'));
        $setSelection(null);
      });
      const written = {...writes};
      t.b.update(() => {
        $line().getAllTextNodes()[1].spliceText(1, 1, '', false);
        $setSelection(null);
      });
      await t.sync();
      await expectEverywhere(t.peers, 'oe two X');
      expect(written).toEqual({del: 'xyz ', ins: ' X'});
    });
  }

  // Text pasted where tokens are made again (a highlighted code line) that
  // starts with the letter the word after it starts with: the common start
  // of the pasted "t68z" took the "t" of "t50z", and the end kept stopped
  // short of it, so the "t" was written again (L2 soak, 18 sessions in
  // 1,500). It keeps its character.
  for (const [edit, expected] of [
    ['deletes the "t" of "t50z"', '// t46z note t68z t69z t70z\n\n 50z t51z'],
    [
      'types "Q" after the "t" of "t50z"',
      '// t46z note t68z t69z t70z\n\n tQ50z t51z',
    ],
  ] as const) {
    for (const ids of IDS) {
      test(`S9-7 a paste before a word that starts with the paste's first letter: the peer ${edit} (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(
                $createTextNode('// t46z note ').toggleFormat('italic'),
                $createTextNode(' '),
                $createTextNode('t50z').toggleFormat('bold'),
                $createTextNode(' t51z'),
              ),
            );
          },
          {ids},
        );
        const writes = track(t.a.doc);
        t.offline();
        t.a.update(() => {
          for (const child of $line().getChildren()) {
            child.remove();
          }
          $line().append(
            $createTextNode('// t46z note t68z t69z t70z'),
            $createLineBreakNode(),
            $createLineBreakNode(),
            $createTextNode(' t50z t51z'),
          );
          $setSelection(null);
        });
        const written = {...writes};
        t.b.update(() => {
          const word = $line().getAllTextNodes()[2];
          if (edit.startsWith('deletes')) {
            word.spliceText(0, 1, '', false);
          } else {
            word.spliceText(1, 0, 'Q', false);
          }
          $setSelection(null);
        });
        await t.sync();
        await expectEverywhere(t.peers, expected);
        expect(written).toEqual({del: ' ', ins: 't68z t69z t70z\n\n '});
      });
    }
  }

  // Review findings on the first version of this change, each a loss main
  // does not have:
  // - the editor composing in another line made the made text's alignment
  //   keep letters of a changed word ("9t94z" for "t91z" ‖ "t94z");
  // - a made word joined to the set word after it ("one" + "two" as
  //   "onetwo") kept "one" of the old "one ", which the peer then deleted
  //   from the new word: a word is now seen whole across what is kept;
  // - a removed word made again twice (a template that repeats it) gave the
  //   last copy the old characters, which the peer's delete then took.
  for (const ids of IDS) {
    test(`S9-7 a word made again as another word while the editor composes in another line (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createTextNode('t1z  '),
              $createTextNode('t3z').toggleFormat('bold'),
            ),
          );
        },
        {ids},
      );
      t.a.update(() => {
        const title = $getRoot().getFirstDescendant() as TextNode;
        title.select(5, 5);
        $setCompositionKey(title.getKey());
      });
      t.offline();
      t.a.update(() => {
        const title = $getRoot().getFirstDescendant() as TextNode;
        title.setTextContent('Title日');
        title.select(6, 6);
        for (const child of $line().getChildren()) {
          child.remove();
        }
        $line().append($createTextNode('t91z  t3z'));
      });
      t.b.update(() => {
        ($line().getFirstChild() as TextNode).spliceText(0, 3, 't94z', false);
        $setSelection(null);
      });
      await t.sync();
      for (const p of t.peers) {
        p.update(() => $setCompositionKey(null));
      }
      await t.sync();
      const text = lineText(t.a);
      expect([text.includes('t91z'), text.includes('t94z')]).toEqual([
        true,
        true,
      ]);
      await expectConverged(t.peers);
    });
  }
  // Second review round: a word is judged whole in all of the old text
  // (`one` of `onex` is not a whole word because `x` was deleted with it)
  // and in the line around the stretch (`red` of `foored` is not the `red`
  // of a new `ored`); text an app made twice keeps the old characters for
  // neither copy.
  const $bold = (text: string) => $createTextNode(text).toggleFormat('bold');
  const $italic = (text: string) =>
    $createTextNode(text).toggleFormat('italic');
  const REVIEW: {
    name: string;
    seed: () => LexicalNode[];
    a: (leaves: TextNode[]) => void;
    b: [leaf: number, offset: number, count: number][];
    expected: string;
  }[] = [
    {
      a: ([first, second]) => {
        first.replace($bold('one'));
        second.setTextContent('two');
      },
      b: [[0, 0, 3]],
      expected: 'onetwo tail',
      name: 'a made word joined to the set word after it',
      seed: () => [$bold('one '), $italic('two!'), $createTextNode(' tail')],
    },
    {
      a: ([first]) => {
        first.replace($createTextNode('blue red red '));
      },
      b: [[0, 0, 4]],
      expected: 'blue red red tail',
      name: 'a removed word made again twice',
      seed: () => [$createTextNode('red '), $italic('tail')],
    },
    {
      a: ([first]) => {
        first.replace($createTextNode('red blue red gold red gold '));
      },
      b: [[0, 4, 4]],
      expected: 'red blue red gold red gold tail',
      name: 'removed words made again twice after a piece of them',
      seed: () => [$createTextNode('red gold '), $italic('tail')],
    },
    {
      a: ([first, second]) => {
        second.remove();
        first.replace($bold('gold one'));
      },
      b: [
        [1, 0, 1],
        [0, 5, 3],
      ],
      expected: 'gold one tail',
      name: 'a word whose last letter was a removed node of its own',
      seed: () => [$bold('blue one'), $italic('x'), $createTextNode(' tail')],
    },
    {
      a: ([first, second]) => {
        first.remove();
        second.replace($bold('one gold'));
      },
      b: [
        [1, 0, 3],
        [0, 0, 1],
      ],
      expected: 'one gold tail',
      name: 'a word whose first letter was a removed node of its own',
      seed: () => [$italic('x'), $bold('one blue'), $createTextNode(' tail')],
    },
    {
      a: ([, second]) => {
        second.replace($createTextNode('blue red ored'));
      },
      b: [[1, 0, 3]],
      expected: 'fooblue red ored tail',
      name: 'a removed node that was one word with the node before it',
      seed: () => [$bold('foo'), $createTextNode('red'), $italic(' tail')],
    },
    // Third review round: a word is judged in the line as it is after the
    // update (not with text made and deleted again in it), and a word or
    // character is whatever goes with it (a joiner, a mark, an emoji's
    // parts); text made twice is checked where it is kept.
    {
      a: ([first]) => {
        const made = $bold('one!gold');
        first.replace(made);
        made.spliceText(3, 1, '', false);
      },
      b: [[0, 0, 3]],
      expected: 'onegold tail',
      name: 'a made word whose separator was deleted again',
      seed: () => [$bold('one blue'), $italic(' tail')],
    },
    ...(
      [
        ['ب\u200dار', 'د\u200dار', 'an Arabic word joined by a ZWJ'],
        ['👩\u200d💻', '👨\u200d💻', 'an emoji sequence'],
        ['か\u3099', 'は\u3099', 'a kana with a combining mark'],
        // (Fourth round: what a stacking sign joins, and Thai and Lao AM.)
        ['\u1780\u17d2\u1781', '\u1782\u17d2\u1781', 'a Khmer conjunct'],
        ['\u1000\u1039\u1001', '\u1002\u1039\u1001', 'a Myanmar conjunct'],
        ['\u0e01\u0e33', '\u0e02\u0e33', 'a Thai consonant with AM'],
        ['\u0e81\u0eb3', '\u0e82\u0eb3', 'a Lao consonant with AM'],
      ] as const
    ).map(([was, now, what]) => ({
      a: ([first]: TextNode[]) => {
        first.replace($createTextNode(`gold ${now}`));
      },
      b: [[0, 5, was.length]] as [number, number, number][],
      expected: `gold ${now} tail`,
      name: `${what} whose first character changed`,
      seed: () => [$createTextNode(`blue ${was}`), $italic(' tail')],
    })),
    {
      a: ([first]) => {
        first.replace($createTextNode('\u1780\u17d2\u1782 gold'));
      },
      b: [[0, 0, 3]],
      expected: '\u1780\u17d2\u1782 gold tail',
      name: 'a Khmer conjunct whose stacked consonant changed',
      seed: () => [
        $createTextNode('\u1780\u17d2\u1781 blue'),
        $italic(' tail'),
      ],
    },
    {
      a: ([first]) => {
        first.replace($createTextNode('red green red gold red gold '));
      },
      b: [[0, 4, 4]],
      expected: 'red green red gold red gold tail',
      name: 'removed words made again twice after a different word',
      seed: () => [$createTextNode('red gold '), $italic('tail')],
    },
    // Fifth round: a character that spans an unchanged node (a Khmer
    // conjunct whose mark is a node of its own) is read in the whole line.
    {
      a: ([first, , third]) => {
        first.replace($bold('\u1782\u17d2'));
        third.replace($createTextNode('\u1781 gold').toggleFormat('underline'));
      },
      b: [[2, 0, 1]],
      expected: '\u1782\u17d2\u17c9\u1781 gold tail',
      name: 'a Khmer conjunct across an unchanged node',
      seed: () => [
        $bold('\u1780\u17d2'),
        $italic('\u17c9'),
        $createTextNode('\u1781 blue').toggleFormat('underline'),
        $createTextNode(' tail'),
      ],
    },
    {
      a: ([first, , third]) => {
        first.replace($bold('\u1783\u17d2'));
        third.replace(
          $createTextNode('\u17d2\u1782 gold').toggleFormat('underline'),
        );
      },
      b: [[2, 0, 2]],
      expected: '\u1783\u17d2\u17c9\u1781\u17d2\u1782 gold tail',
      name: 'a Khmer conjunct whose middle is an unchanged node',
      seed: () => [
        $bold('\u1780\u17d2'),
        $italic('\u17c9\u1781'),
        $createTextNode('\u17d2\u1782 blue').toggleFormat('underline'),
        $createTextNode(' tail'),
      ],
    },
    // Sixth round: a word reads through a soft hyphen, a word joiner and
    // an inline node with text of its own (a mark).
    ...(
      [
        ['be\u00adcome', 'in\u00adcome', 'a word with a soft hyphen'],
        ['be\u2060come', 'in\u2060come', 'a word with a word joiner'],
      ] as const
    ).map(([was, now, what]) => ({
      a: ([first]: TextNode[]) => {
        first.replace($createTextNode(`gold ${now}`));
      },
      b: [[0, 5, was.length]] as [number, number, number][],
      expected: `gold ${now} tail`,
      name: `${what} whose first syllable changed`,
      seed: () => [$createTextNode(`blue ${was}`), $italic(' tail')],
    })),
    {
      a: ([, first, x]) => {
        x.remove();
        first.replace($bold('gold one'));
      },
      b: [
        [2, 0, 1],
        [1, 5, 3],
      ],
      expected: '\u{10400} gold one tail',
      name: 'a word that went on into a mark',
      seed: () => [
        $createTextNode('\u{10400} ').toggleFormat('underline'),
        $createLinkNode('https://example.com/').append(
          $bold('blue one'),
          $createMarkNode(['m']).append($italic('x')),
        ),
        $createTextNode(' tail').toggleFormat('strikethrough'),
      ],
    },
  ];
  for (const {name, seed, a, b, expected} of REVIEW) {
    for (const ids of IDS) {
      test(`S9-7 ${name}: the peer deletes old text in it (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(...seed()),
            );
          },
          {ids},
        );
        t.offline();
        t.a.update(() => {
          a($line().getAllTextNodes());
          $setSelection(null);
        });
        t.b.update(() => {
          // (Each splice in a leaf of the old line, by index then.)
          const leaves = $line().getAllTextNodes();
          for (const [leaf, offset, count] of b) {
            leaves[leaf].spliceText(offset, count, '', false);
          }
          $setSelection(null);
        });
        await t.sync();
        await expectEverywhere(t.peers, expected);
      });
    }
  }

  // Removed text of two places read as one: links emptied, moved into a new
  // line, then text made in one of them. The end of the first link's old
  // text and the rest of the old word after the second link's start must
  // not make a piece of that word look whole.
  for (const [first, pin, second, next, drop] of [
    ['in', 'be', 'come blue', 'income gold', 4],
    // (Both sides whole words of their old lines, joined into one new word.)
    ['in', ' ', 'come blue', 'income gold', 4],
    [
      '\u{1f469}\u200d',
      '\u{1f468}\u200d',
      '\u{1f4bb} blue',
      '\u{1f469}\u200d\u{1f4bb} gold',
      2,
    ],
  ] as const) {
    for (const ids of [
      [1, 2],
      [2, 1],
    ]) {
      test(`S9-7 removed text of two lines read as one: ${first}|${pin}${second} as ${next} (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(
                $createLinkNode('https://example.com/a').append($bold(first)),
              ),
              $createParagraphNode().append(
                $createTextNode(pin).toggleFormat('underline'),
                $createLinkNode('https://example.com/b').append(
                  $italic(second),
                ),
              ),
            );
          },
          {ids},
        );
        t.offline();
        t.a.update(() => {
          const one = $getRoot().getChildAtIndex(1) as ElementNode;
          const two = $getRoot().getChildAtIndex(2) as ElementNode;
          const a = one.getFirstChildOrThrow() as ElementNode;
          const b = two.getLastChildOrThrow() as ElementNode;
          a.getFirstChildOrThrow().remove();
          b.getFirstChildOrThrow().remove();
          const line = $createParagraphNode();
          line.append(a, b);
          one.replace(line);
          two.remove();
          a.append($bold(next));
          b.remove();
          $setSelection(null);
        });
        t.b.update(() => {
          const [x, y] = (
            $getRoot().getChildAtIndex(2) as ElementNode
          ).getAllTextNodes();
          x.spliceText(0, pin.length, '', false);
          y.spliceText(0, drop, '', false);
          $setSelection(null);
        });
        await t.sync();
        for (const p of t.peers) {
          expect(
            p.read(() => $getRoot().getChildAtIndex(1)!.getTextContent()),
          ).toBe(next);
        }
      });
    }
  }

  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    // The same with text typed and removed in the update before the old
    // text of the other line: it does not make that text start a word.
    test(`S9-7 removed text of two lines read as one after typed text (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/pad').append(
                $createTextNode('red ').toggleFormat('code'),
              ),
              $createLinkNode('https://example.com/a').append($bold('X')),
            ),
            $createParagraphNode().append(
              $createTextNode('be').toggleFormat('underline'),
              $createLinkNode('https://example.com/b').append(
                $italic('come blue'),
              ),
            ),
          );
        },
        {ids},
      );
      t.offline();
      t.a.update(() => {
        const one = $getRoot().getChildAtIndex(1) as ElementNode;
        const two = $getRoot().getChildAtIndex(2) as ElementNode;
        const [pad, a] = one.getChildren() as ElementNode[];
        const b = two.getLastChildOrThrow() as ElementNode;
        const typed = a.getFirstChildOrThrow() as TextNode;
        typed.spliceText(0, 1, 'in', false);
        pad.getFirstChildOrThrow().remove();
        typed.remove();
        b.getFirstChildOrThrow().remove();
        one.replace($createParagraphNode().append(pad, a, b));
        two.remove();
        a.append($bold('income gold'));
        b.remove();
        pad.remove();
        $setSelection(null);
      });
      t.b.update(() => {
        const [x, y] = (
          $getRoot().getChildAtIndex(2) as ElementNode
        ).getAllTextNodes();
        x.spliceText(0, 2, '', false);
        y.spliceText(0, 4, '', false);
        $setSelection(null);
      });
      await t.sync();
      for (const p of t.peers) {
        expect(
          p.read(() => $getRoot().getChildAtIndex(1)!.getTextContent()),
        ).toBe('income gold');
      }
    });

    // And where main keeps a letter on each side of where the two lines
    // meet: what follows still needs that place to start a word.
    test(`S9-7 removed text of two lines read as one between kept letters (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/a').append($bold('in')),
            ),
            $createParagraphNode().append(
              $createTextNode('be').toggleFormat('underline'),
              $createLinkNode('https://example.com/b').append(
                $createTextNode('c').toggleFormat('code'),
                $italic('ome blue'),
              ),
            ),
          );
        },
        {ids},
      );
      t.offline();
      t.a.update(() => {
        const one = $getRoot().getChildAtIndex(1) as ElementNode;
        const two = $getRoot().getChildAtIndex(2) as ElementNode;
        const a = one.getFirstChildOrThrow() as ElementNode;
        const b = two.getLastChildOrThrow() as ElementNode;
        for (const leaf of [...a.getChildren(), ...b.getChildren()]) {
          leaf.remove();
        }
        one.replace($createParagraphNode().append(a, b));
        two.remove();
        a.append($bold('inc'));
        b.append($italic('ome gold'));
        $setSelection(null);
      });
      t.b.update(() => {
        const link = (
          $getRoot().getChildAtIndex(2) as ElementNode
        ).getChildren()[1] as ElementNode;
        (link.getChildren()[1] as TextNode).spliceText(0, 3, '', false);
        $setSelection(null);
      });
      await t.sync();
      for (const p of t.peers) {
        expect(
          p.read(() => $getRoot().getChildAtIndex(1)!.getTextContent()),
        ).toBe('income gold');
      }
    });
  }

  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    // Text typed and removed at an island's edge is not old text: the old
    // text after it (` come`, a whole word of its old line) still joins the
    // new word `income`.
    test(`S9-7 removed text of two lines read as one, typed text before a whole old word (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/pad').append(
                $createTextNode('red ').toggleFormat('code'),
              ),
              $createLinkNode('https://example.com/a').append($bold('X')),
            ),
            $createParagraphNode().append(
              $createTextNode(' ').toggleFormat('underline'),
              $createLinkNode('https://example.com/b').append(
                $italic('come blue'),
              ),
            ),
          );
        },
        {ids},
      );
      t.offline();
      t.a.update(() => {
        const one = $getRoot().getChildAtIndex(1) as ElementNode;
        const two = $getRoot().getChildAtIndex(2) as ElementNode;
        const [pad, a] = one.getChildren() as ElementNode[];
        const b = two.getLastChildOrThrow() as ElementNode;
        const typed = a.getFirstChildOrThrow() as TextNode;
        typed.spliceText(0, 1, 'in', false);
        pad.getFirstChildOrThrow().remove();
        typed.remove();
        b.getFirstChildOrThrow().remove();
        one.replace($createParagraphNode().append(pad, a, b));
        two.remove();
        a.append($bold('income gold'));
        b.remove();
        pad.remove();
        $setSelection(null);
      });
      t.b.update(() => {
        const [, y] = (
          $getRoot().getChildAtIndex(2) as ElementNode
        ).getAllTextNodes();
        y.spliceText(0, 4, '', false);
        $setSelection(null);
      });
      await t.sync();
      for (const p of t.peers) {
        expect(
          p.read(() => $getRoot().getChildAtIndex(1)!.getTextContent()),
        ).toBe('income gold');
      }
    });

    // The same at the end: `one`, a whole word of its old line, before
    // text typed and removed (`ness`) in the new word `oneness`.
    test(`S9-7 removed text of two lines read as one, a whole old word before typed text (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/a').append(
                $bold('blue one'),
              ),
            ),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/b').append($italic('X')),
              $createLinkNode('https://example.com/pad').append(
                $createTextNode(' red').toggleFormat('code'),
              ),
            ),
          );
        },
        {ids},
      );
      t.offline();
      t.a.update(() => {
        const one = $getRoot().getChildAtIndex(1) as ElementNode;
        const two = $getRoot().getChildAtIndex(2) as ElementNode;
        const a = one.getFirstChildOrThrow() as ElementNode;
        const [b, pad] = two.getChildren() as ElementNode[];
        const typed = b.getFirstChildOrThrow() as TextNode;
        typed.spliceText(0, 1, 'ness', false);
        a.getFirstChildOrThrow().remove();
        typed.remove();
        pad.getFirstChildOrThrow().remove();
        one.replace($createParagraphNode().append(a, b));
        two.remove();
        a.append($bold('gold oneness'));
        b.remove();
        $setSelection(null);
      });
      t.b.update(() => {
        const [x] = (
          $getRoot().getChildAtIndex(1) as ElementNode
        ).getAllTextNodes();
        x.spliceText(5, 3, '', false);
        $setSelection(null);
      });
      await t.sync();
      for (const p of t.peers) {
        expect(
          p.read(() => $getRoot().getChildAtIndex(1)!.getTextContent()),
        ).toBe('gold oneness');
      }
    });
  }

  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    // Text typed in another line and removed does not join old letters
    // that followed each other (`o` and `ne` of `one`) into one word.
    test(`S9-7 text typed elsewhere between old letters of a word (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/l').append($bold('o')),
              $createLinkNode('https://example.com/r').append(
                $italic('ne blue'),
              ),
            ),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/m').append(
                $createTextNode('Q').toggleFormat('code'),
              ),
            ),
          );
        },
        {ids},
      );
      t.offline();
      t.a.update(() => {
        const one = $getRoot().getChildAtIndex(1) as ElementNode;
        const two = $getRoot().getChildAtIndex(2) as ElementNode;
        const [l, r] = one.getChildren() as ElementNode[];
        const m = two.getFirstChildOrThrow() as ElementNode;
        const typed = m.getFirstChildOrThrow() as TextNode;
        typed.spliceText(0, 1, 'X', false);
        l.getFirstChildOrThrow().remove();
        r.getFirstChildOrThrow().remove();
        typed.remove();
        one.replace($createParagraphNode().append(l, m, r));
        two.remove();
        l.append($bold('oXne gold'));
        m.remove();
        r.remove();
        $setSelection(null);
      });
      t.b.update(() => {
        const [, y] = (
          $getRoot().getChildAtIndex(1) as ElementNode
        ).getAllTextNodes();
        y.spliceText(0, 2, '', false);
        $setSelection(null);
      });
      await t.sync();
      for (const p of t.peers) {
        expect(
          p.read(() => $getRoot().getChildAtIndex(1)!.getTextContent()),
        ).toBe('oXne gold');
      }
    });
  }

  for (const ids of [
    [1, 2],
    [2, 1],
  ]) {
    // Nor does text typed elsewhere in the same line: only text typed
    // exactly between two old letters joins them.
    test(`S9-7 text typed elsewhere in the line between old letters of a word (ids ${ids})`, async () => {
      const t = await setup(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('Title')),
            $createParagraphNode().append(
              $createLinkNode('https://example.com/l').append($bold('o')),
              $createLinkNode('https://example.com/r').append(
                $italic('ne blue'),
              ),
              $createTextNode(' '),
              $createLinkNode('https://example.com/m').append(
                $createTextNode('Q').toggleFormat('code'),
              ),
            ),
          );
        },
        {ids},
      );
      t.offline();
      t.a.update(() => {
        const one = $getRoot().getChildAtIndex(1) as ElementNode;
        const [l, r, space, m] = one.getChildren() as ElementNode[];
        const typed = m.getFirstChildOrThrow() as TextNode;
        typed.spliceText(0, 1, 'X', false);
        l.getFirstChildOrThrow().remove();
        r.getFirstChildOrThrow().remove();
        typed.remove();
        space.remove();
        one.replace($createParagraphNode().append(l, m, r));
        l.append($bold('oXne gold'));
        m.remove();
        r.remove();
        $setSelection(null);
      });
      t.b.update(() => {
        const [, y] = (
          $getRoot().getChildAtIndex(1) as ElementNode
        ).getAllTextNodes();
        y.spliceText(0, 2, '', false);
        $setSelection(null);
      });
      await t.sync();
      for (const p of t.peers) {
        expect(
          p.read(() => $getRoot().getChildAtIndex(1)!.getTextContent()),
        ).toBe('oXne gold');
      }
    });
  }

  test('S9-7 without Intl.Segmenter, text of nodes made keeps no removed text in part', async () => {
    vi.resetModules();
    vi.stubGlobal('Intl', {...Intl, Segmenter: undefined});
    try {
      // (Fresh modules, Lexical's too: the binding reads the platform once.)
      const lexical = await import('lexical');
      const harness = await import('../../utils/harness');
      const $lineOf = () =>
        lexical.$getRoot().getChildAtIndex(1) as ElementNode;
      const t = await harness.setup(() => {
        lexical
          .$getRoot()
          .append(
            lexical
              .$createParagraphNode()
              .append(lexical.$createTextNode('Title')),
            lexical
              .$createParagraphNode()
              .append(lexical.$createTextNode('t63 t71z t69z')),
          );
      });
      t.offline();
      t.a.update(() => {
        $lineOf().getFirstChildOrThrow().remove();
        $lineOf().append(lexical.$createTextNode('t63 t71z t81z'));
        lexical.$setSelection(null);
      });
      t.b.update(() => {
        ($lineOf().getFirstChildOrThrow() as TextNode).spliceText(
          3,
          0,
          'Q',
          false,
        );
        lexical.$setSelection(null);
      });
      await t.sync();
      // (The line is written again whole, as before this rule, so Q stays
      // where its old characters were.)
      expect(
        t.peers.map(p => p.read(() => $lineOf().getTextContent())),
      ).toEqual(['Qt63 t71z t81z', 'Qt63 t71z t81z']);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  test('S9-7 without Intl.Segmenter, a stacking sign joins across the marks after it', async () => {
    vi.resetModules();
    vi.stubGlobal('Intl', {...Intl, Segmenter: undefined});
    try {
      const {wordCut} = await import('../../../internal/Inline');
      const cuts = (t: string) =>
        Array.from({length: t.length - 1}, (_, k) => k + 1).filter(k =>
          wordCut(t, k),
        );
      // KA, COENG, MUUSIKATOAN, KHA; KA, VIRAMA, VOWEL SIGN I, KHA
      expect(cuts('\u1780\u17d2\u17c9\u1781')).toEqual([]);
      expect(cuts('\u1000\u1039\u102d\u1001')).toEqual([]);
      expect(cuts('\u0e01\u0e33\u0e02')).toEqual([2]);
      // halfwidth KA and its voiced sound mark
      expect(cuts('\uff76\uff9e')).toEqual([]);
      // KA, VIRAMA, an emoji modifier, KHA; a prepend sign (U+113D1) and A
      expect(cuts('\u0915\u094d\u{1f3fb}\u0916')).toEqual([]);
      expect(cuts('\u{113d1}\u3042')).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  // A word made again as another word that holds its letters ("t1z" as
  // "t91z") is a new word, not a "9" typed into it: a peer's concurrent
  // replacement of the old word deletes its letters, which a write that
  // kept them would have taken from the new word ("9t94z", L2 soak C
  // 9310469). Both new words stay. With a text set (`setTextContent`), the
  // text is still written as the letters typed: a known failure.
  for (const how of ['made', 'set'] as const) {
    for (const ids of IDS) {
      (how === 'set' ? test.fails : test)(
        `S9-7 "t1z" ${how} again as "t91z" ‖ the peer replaces "t1z" with "t94z" (ids ${ids})`,
        async () => {
          const t = await setup(
            () => {
              $getRoot().append(
                $createParagraphNode().append($createTextNode('Title')),
                $createParagraphNode().append(
                  $createTextNode('t1z  '),
                  $createTextNode('t3z').toggleFormat('bold'),
                ),
              );
            },
            {ids},
          );
          t.offline();
          t.a.update(() => {
            const line = $line();
            if (how === 'set') {
              (line.getFirstChild() as TextNode).setTextContent('t91z  ');
            } else {
              for (const child of line.getChildren()) {
                child.remove();
              }
              line.append($createTextNode('t91z  t3z'));
            }
            $setSelection(null);
          });
          t.b.update(() => {
            ($line().getFirstChild() as TextNode).spliceText(
              0,
              3,
              't94z',
              false,
            );
            $setSelection(null);
          });
          await t.sync();
          const text = lineText(t.a);
          expect([text.includes('t91z'), text.includes('t94z')]).toEqual([
            true,
            true,
          ]);
          await expectConverged(t.peers);
        },
      );
    }
  }

  // A removed node whose text the made text holds twice, once right before
  // the old text that followed it (a piece of a word, which a highlighter
  // splits off where a NodeState changes, and text pasted before it, #9563):
  // it keeps its characters there.
  for (const [edit, expected] of [
    ['deletes the old "t"', 't48zQ t78z 49z t50z'],
    ['types "Z" after the old "t"', 't48zQ t78z tZ49z t50z'],
  ] as const) {
    for (const ids of IDS) {
      test(`S9-7 a piece of a word made again after text that holds it too: the peer ${edit} (ids ${ids})`, async () => {
        const t = await setup(
          () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Title')),
              $createParagraphNode().append(
                $createTextNode('t48z'),
                $createTextNode(' t').toggleFormat('italic'),
                $createTextNode('49z t50z'),
              ),
            );
          },
          {ids},
        );
        const writes = track(t.a.doc);
        t.offline();
        t.a.update(() => {
          for (const child of $line().getChildren()) {
            child.remove();
          }
          $line().append($createTextNode('t48zQ t78z t49z t50z'));
          $setSelection(null);
        });
        const written = {...writes};
        t.b.update(() => {
          const piece = $line().getAllTextNodes()[1];
          if (edit.startsWith('deletes')) {
            piece.spliceText(1, 1, '', false);
          } else {
            piece.spliceText(2, 0, 'Z', false);
          }
          $setSelection(null);
        });
        await t.sync();
        await expectEverywhere(t.peers, expected);
        expect(written).toEqual({del: '', ins: 'Q t78z'});
      });
    }
  }
});
