/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Version skew: clients of two app versions edit one room (during a
// rollout). Each case is named after its finding.
//
// S7-3: a client whose class lacks a field a newer version of the class
// declares (a "v1" class next to the "v2" one) keeps that field when it
// writes the node: it writes and deletes only the stored names it owns (see
// ownsNodeAttr and the rest in Schema.ts). Each case runs one edit made by a
// v1 client and the same edit made by a v2 client, and requires the same
// document, as a v2 reader reads it; three clients (the v1 one, the v2 one
// that wrote the content, a fresh reader) converge each time.
//
// S7-11: content of a type a client does not register opens the room read
// only for it, whatever kind stores it: a line, a group, text, a node, or an
// inline element stored as a format (a link class it lacks).

import type {ListItemNode} from '@lexical/list';

import {$createLinkNode, LinkNode} from '@lexical/link';
import {$createListItemNode, ListNode} from '@lexical/list';
import {HeadingNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $getState,
  $isElementNode,
  $isTextNode,
  $setSlot,
  $setState,
  arraySetValue,
  createState,
  DecoratorNode,
  ElementNode,
  type Klass,
  type LexicalNode,
  type LexicalUpdateJSON,
  nodeSchema,
  ParagraphNode,
  type SerializedElementNode,
  stringValue,
  TextNode,
  withField,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  editYState,
  readYState,
  seedYState,
  YHeadlessError,
} from '../../../headless';
import {
  ownedFields,
  ownsFormat,
  ownsMarkerAttr,
  ownsMember,
  ownsNodeAttr,
} from '../../../internal/Schema';
import {UNKNOWN_NODE_TYPES_WARNING} from '../../../internal/Warnings';
import {
  $block,
  $createBoxNode,
  $p,
  $selectIn,
  flush,
  freshReader,
  NODES,
  Peer,
  shape,
} from '../../utils/harness';

// ---------------------------------------------------------------------------
// v1 and v2 of app node types: v2 adds a field to each.

const cardV1Schema = nodeSchema<CardV1>()({
  label: withField(stringValue(), {field: '__label'}),
});
class CardV1 extends ElementNode {
  __label: string = '';
  $config() {
    return this.config('test_skew_card', {
      extends: ElementNode,
      json: cardV1Schema,
    });
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}
const cardV2Schema = nodeSchema<CardV2>()({
  label: withField(stringValue(), {field: '__label'}),
  tone: withField(stringValue(), {field: '__tone'}),
});
class CardV2 extends ElementNode {
  __label: string = '';
  __tone: string = '';
  $config() {
    return this.config('test_skew_card', {
      extends: ElementNode,
      json: cardV2Schema,
    });
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}

const imageV1Schema = nodeSchema<ImageV1>()({
  src: withField(stringValue(), {field: '__src'}),
});
class ImageV1 extends DecoratorNode<null> {
  __src: string = '';
  $config() {
    return this.config('test_skew_image', {
      extends: DecoratorNode,
      json: imageV1Schema,
    });
  }
  isInline(): boolean {
    return false;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}
const imageV2Schema = nodeSchema<ImageV2>()({
  alt: withField(stringValue(), {field: '__alt'}),
  src: withField(stringValue(), {field: '__src'}),
});
class ImageV2 extends DecoratorNode<null> {
  __src: string = '';
  __alt: string = '';
  $config() {
    return this.config('test_skew_image', {
      extends: DecoratorNode,
      json: imageV2Schema,
    });
  }
  isInline(): boolean {
    return false;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

const chipV1Schema = nodeSchema<ChipV1>()({
  name: withField(stringValue(), {field: '__name'}),
});
class ChipV1 extends DecoratorNode<null> {
  __name: string = '';
  $config() {
    return this.config('test_skew_chip', {
      extends: DecoratorNode,
      json: chipV1Schema,
    });
  }
  isInline(): boolean {
    return true;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}
const chipV2Schema = nodeSchema<ChipV2>()({
  color: withField(stringValue(), {field: '__color'}),
  name: withField(stringValue(), {field: '__name'}),
});
class ChipV2 extends DecoratorNode<null> {
  __name: string = '';
  __color: string = '';
  $config() {
    return this.config('test_skew_chip', {
      extends: DecoratorNode,
      json: chipV2Schema,
    });
  }
  isInline(): boolean {
    return true;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

class NoteV1 extends ParagraphNode {
  $config() {
    return this.config('test_skew_note', {extends: ParagraphNode});
  }
}
const noteV2Schema = nodeSchema<NoteV2>()({
  tone: withField(stringValue(), {field: '__tone'}),
});
class NoteV2 extends ParagraphNode {
  __tone: string = '';
  $config() {
    return this.config('test_skew_note', {
      extends: ParagraphNode,
      json: noteV2Schema,
    });
  }
}

class ListV1 extends ListNode {
  $config() {
    return this.config('test_skew_list', {extends: ListNode});
  }
}
const listV2Schema = nodeSchema<ListV2>()({
  tone: withField(stringValue(), {field: '__tone'}),
});
class ListV2 extends ListNode {
  __tone: string = '';
  $config() {
    return this.config('test_skew_list', {
      extends: ListNode,
      json: listV2Schema,
    });
  }
}

class LinkV1 extends LinkNode {
  $config() {
    return this.config('test_skew_link', {extends: LinkNode});
  }
}
const linkV2Schema = nodeSchema<LinkV2>()({
  tone: withField(stringValue(), {field: '__tone'}),
});
class LinkV2 extends LinkNode {
  __tone: string = '';
  $config() {
    return this.config('test_skew_link', {
      extends: LinkNode,
      json: linkV2Schema,
    });
  }
}

class TagV1 extends TextNode {
  $config() {
    return this.config('test_skew_tag', {extends: TextNode});
  }
}
const tagV2Schema = nodeSchema<TagV2>()({
  tag: withField(stringValue(), {field: '__tag'}),
});
class TagV2 extends TextNode {
  __tag: string = '';
  $config() {
    return this.config('test_skew_tag', {
      extends: TextNode,
      json: tagV2Schema,
    });
  }
}

// A class that writes its JSON by hand (no `$config` schema).
type SerializedLegacy = SerializedElementNode & {label?: string; tone?: string};
class LegacyV1 extends ElementNode {
  __label = '';
  static getType(): string {
    return 'test_skew_legacy';
  }
  static clone(node: LegacyV1): LegacyV1 {
    const copy = new LegacyV1(node.__key);
    copy.__label = node.__label;
    return copy;
  }
  static importJSON(json: SerializedLegacy): LegacyV1 {
    return new LegacyV1().updateFromJSON(json);
  }
  updateFromJSON(json: LexicalUpdateJSON<SerializedLegacy>): this {
    const self = super.updateFromJSON(json);
    self.__label = json.label ?? '';
    return self;
  }
  exportJSON(): SerializedLegacy {
    return {...super.exportJSON(), label: this.__label};
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}
class LegacyV2 extends ElementNode {
  __label = '';
  __tone = '';
  static getType(): string {
    return 'test_skew_legacy';
  }
  static clone(node: LegacyV2): LegacyV2 {
    const copy = new LegacyV2(node.__key);
    copy.__label = node.__label;
    copy.__tone = node.__tone;
    return copy;
  }
  static importJSON(json: SerializedLegacy): LegacyV2 {
    return new LegacyV2().updateFromJSON(json);
  }
  updateFromJSON(json: LexicalUpdateJSON<SerializedLegacy>): this {
    const self = super.updateFromJSON(json);
    self.__label = json.label ?? '';
    self.__tone = json.tone ?? '';
    return self;
  }
  exportJSON(): SerializedLegacy {
    return {...super.exportJSON(), label: this.__label, tone: this.__tone};
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}

const V1: Klass<LexicalNode>[] = [
  ...NODES,
  CardV1,
  ImageV1,
  ChipV1,
  NoteV1,
  ListV1,
  LinkV1,
  TagV1,
  LegacyV1,
];
const V2: Klass<LexicalNode>[] = [
  ...NODES,
  CardV2,
  ImageV2,
  ChipV2,
  NoteV2,
  ListV2,
  LinkV2,
  TagV2,
  LegacyV2,
];

// A NodeState only the v2 app uses, and a set-valued one (stored one entry
// per member on text and nodes stored as their own Y.Node).
const moodState = createState('test_skew_mood', {parse: stringValue()});
const tagsState = createState('test_skew_tags', {
  parse: arraySetValue(stringValue()),
});

// ---------------------------------------------------------------------------
// Rooms

type Net = {
  peers: Peer[];
  delivery: 'causal';
  queue: [Peer, Uint8Array][];
  pumping: boolean;
};
const newNet = (): Net => ({
  delivery: 'causal',
  peers: [],
  pumping: false,
  queue: [],
});

type Room = {author: Peer; editor: Peer};

/**
 * A room whose content a v2 client (`author`) writes with `$init`, joined by
 * a client with `editorNodes` (`editor`).
 */
async function room(
  editorNodes: Klass<LexicalNode>[],
  $init: () => void,
): Promise<Room> {
  const net = newNet();
  const author = new Peer(2, net as never, V2);
  const editor = new Peer(1, net as never, editorNodes);
  author.update(() => {
    $getRoot().clear();
    $init();
  });
  author.binding.initialize();
  await flush();
  return {author, editor};
}

/**
 * The editor of a new room makes `$edit` (with the v1 nodes or the v2 nodes):
 * the clients converge, each version with a fresh reader of its own, and the
 * room is returned with a fresh v2 reader's document.
 */
async function edited(
  editorNodes: Klass<LexicalNode>[],
  $init: () => void,
  $edit: (r: Room) => void,
): Promise<Room & {stored: unknown}> {
  const r = await room(editorNodes, $init);
  expect(r.editor.binding.status).toBe('active');
  r.editor.update(() => $edit(r));
  await flush();
  for (const peer of [r.author, r.editor]) {
    expect(peer.errors).toEqual([]);
    expect(peer.warnings).toEqual([]);
    expect(peer.binding.status).toBe('active');
  }
  const freshNew = await freshReader(r.author);
  const freshOld = await freshReader(r.author, editorNodes);
  expect(shape(freshNew)).toEqual(shape(r.author));
  expect(shape(freshOld)).toEqual(shape(r.editor));
  expect(freshNew.warnings).toEqual([]);
  expect(freshOld.warnings).toEqual([]);
  return {...r, stored: shape(freshNew)};
}

/**
 * `$edit` made by a v1 client stores what the same edit made by a v2 client
 * stores. Returns the v1 client's room.
 */
async function expectSameAsV2(
  $init: () => void,
  $edit: (r: Room) => void,
): Promise<Room & {stored: unknown}> {
  const byV1 = await edited(V1, $init, $edit);
  const byV2 = await edited(V2, $init, $edit);
  expect(byV1.stored).toEqual(byV2.stored);
  return byV1;
}

const docJSON = (peer: Peer): string => JSON.stringify(peer.json());

/** The marker of the first line of `type` in the root of `doc`. */
function markerOf(doc: Y.Doc, type: string): Y.Node {
  for (let it = doc.get('lexical-y')._start; it !== null; it = it.right) {
    const content = it.content;
    if (
      !it.deleted &&
      content instanceof Y.ContentType &&
      content.type.name === '\u00b6' &&
      content.type.getAttr('t') === type
    ) {
      return content.type as Y.Node;
    }
  }
  throw new Error(`no ${type} marker`);
}

// ---------------------------------------------------------------------------
// Content

const $card = () => {
  const card = $create(CardV2).append($p('in the card'));
  card.__label = 'Card';
  card.__tone = 'warm';
  return card;
};
const $image = () => {
  const image = $create(ImageV2);
  image.__src = 'a.png';
  image.__alt = 'A cat';
  return image;
};
const $chip = () => {
  const chip = $create(ChipV2);
  chip.__name = 'Ada';
  chip.__color = 'teal';
  return chip;
};
const $note = (text = 'a note') => {
  const note = $create(NoteV2).append($createTextNode(text));
  note.__tone = 'warm';
  return note;
};
const $list = (...items: string[]) => {
  const list = $create(ListV2);
  list.__listType = 'bullet';
  list.__tag = 'ul';
  list.__tone = 'warm';
  for (const text of items) {
    list.append($createListItemNode().append($createTextNode(text)));
  }
  return list;
};
const $link = () => {
  const link = $create(LinkV2);
  link.__url = 'https://a.dev';
  link.__tone = 'warm';
  return link.append($createTextNode('link text'));
};
const $tag = () => {
  const tag = $create(TagV2).setTextContent('tagged words');
  tag.__tag = 'x1';
  return tag;
};

// ---------------------------------------------------------------------------

describe('S7-3: an older client keeps the fields a newer class added', () => {
  test('a block container: its format, and a field the old class knows', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($card(), $p('after')),
      () => {
        const card = $block([0]) as CardV1;
        card.setFormat('center');
        card.getWritable().__label = 'Renamed';
      },
    );
    expect(docJSON(r.author)).toContain('"tone":"warm"');
    expect(docJSON(r.author)).toContain('"label":"Renamed"');
  });

  test('a block decorator: a field the old class knows', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($image(), $p('after')),
      () => {
        ($block([0]) as unknown as ImageV1).getWritable().__src = 'b.png';
      },
    );
    expect(docJSON(r.author)).toContain('"alt":"A cat"');
    expect(docJSON(r.author)).toContain('"src":"b.png"');
  });

  test('an inline decorator: a field the old class knows', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($p('hi ').append($chip())),
      () => {
        const chip = $block([0]).getChildAtIndex(1) as unknown as ChipV1;
        chip.getWritable().__name = 'Grace';
      },
    );
    expect(docJSON(r.author)).toContain('"color":"teal"');
    expect(docJSON(r.author)).toContain('"name":"Grace"');
  });

  test('a line: its format (as before)', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($note(), $p('after')),
      () => $block([0]).setFormat('center'),
    );
    expect(docJSON(r.author)).toContain('"tone":"warm"');
  });

  test('a line whose type changes takes no field of the old type', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($note(), $p('after')),
      () => {
        const note = $block([0]);
        const heading = $create(HeadingNode);
        heading.append(...note.getChildren());
        note.replace(heading);
      },
    );
    expect(docJSON(r.author)).not.toContain('"tone"');
  });

  test('a group: its key fields', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($list('one', 'two')),
      () => ($block([0]) as ListNode).setStart(3),
    );
    expect(docJSON(r.author)).toContain('"tone":"warm"');
    expect(docJSON(r.author)).toContain('"start":3');
  });

  test('a group: an item added before its first item', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($list('one')),
      () =>
        ($block([0]).getFirstChildOrThrow() as ListItemNode).insertBefore(
          $createListItemNode().append($createTextNode('zero')),
        ),
    );
    expect(docJSON(r.author)).toContain('"tone":"warm"');
  });

  test('a group: an item added after its last item', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($list('one')),
      () =>
        $block([0]).append(
          $createListItemNode().append($createTextNode('two')),
        ),
    );
    expect(docJSON(r.author)).toContain('"tone":"warm"');
  });

  test('a group holding a nested group: the outer key fields', async () => {
    const r = await expectSameAsV2(
      () => {
        const outer = $list('one');
        const inner = $list('nested');
        inner.__tone = 'cool';
        outer.append($createListItemNode().append(inner));
        $getRoot().append(outer);
      },
      () => ($block([0]) as ListNode).setStart(5),
    );
    expect(docJSON(r.author)).toContain('"tone":"warm"');
    expect(docJSON(r.author)).toContain('"tone":"cool"');
  });

  test('an inline element stored as a format: its URL', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($p('see ').append($link())),
      () =>
        ($block([0]).getChildAtIndex(1) as LinkNode).setURL('https://b.dev'),
    );
    expect(docJSON(r.author)).toContain('"tone":"warm"');
    expect(docJSON(r.author)).toContain('https://b.dev');
  });

  test('an inline element stored as a format: typing inside it', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($p('see ').append($link())),
      () => $selectIn([0], 7).insertText('Q'),
    );
    expect(r.author.read(() => $block([0]).getChildrenSize())).toBe(2);
    expect(docJSON(r.author)).toContain('"tone":"warm"');
  });

  test('a text subclass: bold over part of it', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($p('before ').append($tag())),
      () => $selectIn([0], 7, 13).formatText('bold'),
    );
    expect(docJSON(r.author)).toContain('"tag":"x1"');
  });

  test('a text subclass: typing inside it', async () => {
    const r = await expectSameAsV2(
      () => $getRoot().append($p('before ').append($tag())),
      () => $selectIn([0], 10).insertText('Q'),
    );
    const tags = r.author.read(() =>
      $block([0])
        .getChildren()
        .filter($isTextNode)
        .map(t => `${t.getTextContent()}:${(t as TagV2).__tag ?? '-'}`),
    );
    expect(tags).toEqual(['before :-', 'tagQged words:x1']);
  });

  test('NodeState the old app does not know, on a node, a line and text', async () => {
    const r = await expectSameAsV2(
      () => {
        const card = $card();
        $setState(card, moodState, 'calm');
        const text = $createTextNode('plain words');
        $setState(text, moodState, 'happy');
        const line = $createParagraphNode().append(text);
        $setState(line, moodState, 'sad');
        $getRoot().append(card, line);
      },
      () => {
        ($block([0]) as CardV1).setFormat('right');
        $block([1]).setFormat('center');
        $selectIn([1], 0, 5).formatText('italic');
      },
    );
    for (const mood of ['calm', 'happy', 'sad']) {
      expect(docJSON(r.author)).toContain(`"test_skew_mood":"${mood}"`);
    }
  });

  test('a set-valued NodeState the old app does not know', async () => {
    const r = await expectSameAsV2(
      () => {
        const text = $createTextNode('tagged text');
        $setState(text, tagsState, ['x', 'y']);
        const image = $image();
        $setState(image, tagsState, ['z']);
        $getRoot().append($createParagraphNode().append(text), image);
      },
      () => {
        $selectIn([0], 0, 6).formatText('bold');
        ($block([1]) as unknown as ImageV1).getWritable().__src = 'b.png';
      },
    );
    const sets = r.author.read(() => [
      ...$block([0])
        .getChildren()
        .map(t => $getState(t, tagsState)),
      $getState($getRoot().getChildAtIndex(1)!, tagsState),
    ]);
    expect(sets).toEqual([['x', 'y'], ['x', 'y'], ['z']]);
  });

  test("a named slot the old client's class does not use", async () => {
    const r = await expectSameAsV2(
      () => {
        const card = $card();
        $setSlot(card, 'caption', $p('a caption'));
        $getRoot().append(card);
      },
      () => ($block([0]) as CardV1).setFormat('center'),
    );
    expect(
      r.author.read(() => $getSlot($block([0]), 'caption')?.getTextContent()),
    ).toBe('a caption');
  });

  test('a root attribute the old client does not know', async () => {
    const r = await room(V1, () => $getRoot().append($card()));
    const root = r.author.doc.get('lexical-y');
    r.author.doc.transact(() => root.setAttr('zz:future', 'kept'));
    await flush();
    r.editor.update(() => $block([0]).setFormat('center'));
    await flush();
    expect(root.getAttr('zz:future')).toBe('kept');
    expect(r.editor.doc.get('lexical-y').getAttr('zz:future')).toBe('kept');
  });

  describe('a field the client knows and clears is deleted', () => {
    test.each([
      [
        'a decorator',
        () => $getRoot().append($image(), $p('after')),
        () => {
          ($block([0]) as unknown as ImageV1).getWritable().__src = 'b.png';
        },
        () => {
          ($block([0]) as unknown as ImageV2).getWritable().__alt = '';
        },
        '"alt":"A cat"',
      ],
      [
        'a group',
        () => $getRoot().append($list('one', 'two')),
        () => ($block([0]) as ListNode).setStart(3),
        () => {
          ($block([0]) as ListV2).getWritable().__tone = '';
        },
        '"tone":"warm"',
      ],
      [
        'an inline element stored as a format',
        () => $getRoot().append($p('see ').append($link())),
        () =>
          ($block([0]).getChildAtIndex(1) as LinkNode).setURL('https://b.dev'),
        () => {
          ($block([0]).getChildAtIndex(1) as LinkV2).getWritable().__tone = '';
        },
        '"tone":"warm"',
      ],
      [
        'a text subclass',
        () => $getRoot().append($p('before ').append($tag())),
        () => $selectIn([0], 7, 13).formatText('bold'),
        () => {
          ($block([0]).getChildAtIndex(1) as TagV2).getWritable().__tag = '';
        },
        '"tag":"x1"',
      ],
    ] as const)('%s', async (_name, $init, $editV1, $clear, value) => {
      // After a v1 client's edit kept it.
      const r = await room(V1, $init);
      r.editor.update($editV1);
      await flush();
      expect(docJSON(r.author)).toContain(value);
      r.author.update($clear);
      await flush();
      const fresh = await freshReader(r.author);
      expect(docJSON(r.author)).not.toContain(value);
      expect(shape(fresh)).toEqual(shape(r.author));
      expect(shape(await freshReader(r.author, V1))).toEqual(shape(r.editor));
    });
  });

  test("a group's field left on a line that is no item is deleted, as before", async () => {
    // Concurrent edits can leave one (a list item made a heading while a
    // peer changes the list's type): no group's, so every client owns it.
    const r = await room(V2, () =>
      $getRoot().append($create(HeadingNode).append($createTextNode('title'))),
    );
    const marker = markerOf(r.author.doc, 'heading');
    r.author.doc.transact(() => marker.setAttr('g:listType', 'bullet'));
    await flush();
    r.editor.update(() => $block([0]).setFormat('center'));
    await flush();
    expect(marker.getAttr('g:listType')).toBeUndefined();
    expect(marker.getAttr('p:format')).toBe('center');
  });

  test('a class that writes its JSON by hand owns every field of its type', async () => {
    // Which fields such a class writes cannot be known, so an older version
    // of it deletes the ones a newer version added (documented in y.md).
    const r = await room(V1, () => {
      const node = $create(LegacyV2).append($p('legacy'));
      node.__label = 'L';
      node.__tone = 'warm';
      $getRoot().append(node);
    });
    expect(docJSON(r.author)).toContain('"tone":"warm"');
    r.editor.update(() => {
      ($block([0]) as LegacyV1).getWritable().__label = 'M';
    });
    await flush();
    expect(docJSON(r.author)).toContain('"label":"M"');
    expect(docJSON(r.author)).not.toContain('"tone":"warm"');
  });

  test.fails(
    'limit: a block an older client moves keeps the fields it does not know',
    async () => {
      // A move writes the block anew from what the moving client shows
      // (see "Moves" in y.md's limits): here into a container.
      const r = await room(V1, () => $getRoot().append($note(), $p('after')));
      r.editor.update(() => {
        const note = $getRoot().getFirstChildOrThrow();
        const box = $createBoxNode('t');
        note.insertBefore(box);
        box.append(note);
      });
      await flush();
      expect(docJSON(r.author)).toContain('"tone":"warm"');
    },
  );
});

describe('S7-3: which stored names a client owns', () => {
  test('a node or marker attribute', () => {
    const fields = new Set(['src']);
    expect(ownsNodeAttr('p:src', fields)).toBe(true);
    expect(ownsNodeAttr('p:alt', fields)).toBe(false);
    expect(ownsNodeAttr('s:anything', fields)).toBe(true);
    expect(ownsNodeAttr('t', fields)).toBe(false);
    const group = new Set(['listType']);
    for (const key of ['t', 'g', 'l', 'o', 'g:$', 'g:listType', 's:x']) {
      expect(ownsMarkerAttr(key, fields, group)).toBe(true);
    }
    for (const key of ['g:tone', 'p:alt', 'zz']) {
      expect(ownsMarkerAttr(key, fields, group)).toBe(false);
    }
  });

  test('a text format and a member of a value', () => {
    const fields = new Set(['style']);
    const wrapper = (type: string) =>
      type === 'link' ? new Set(['url']) : null;
    for (const key of ['t', 'k', 'f:bold', 'p:style', 's:x', 'w:link']) {
      expect(ownsFormat(key, fields, wrapper)).toBe(true);
    }
    for (const key of ['f:sparkle', 'p:tag', 'w:fancy', 'zz']) {
      expect(ownsFormat(key, fields, wrapper)).toBe(false);
    }
    const url = new Set(['url']);
    for (const member of ['url', '#', '@', '$', 's:x']) {
      expect(ownsMember(member, url)).toBe(true);
    }
    expect(ownsMember('tone', url)).toBe(false);
  });

  test("a client's fields at a location: its class's, or every field where the type changes", () => {
    const old = new Peer(7, newNet() as never, V1);
    const fields = ownedFields(
      old.editor,
      'test_skew_card',
      'test_skew_card',
      false,
    );
    expect(fields.has('label')).toBe(true);
    expect(fields.has('format')).toBe(true);
    expect(fields.has('tone')).toBe(false);
    expect(
      ownedFields(old.editor, 'test_skew_card', 'paragraph', false).has('tone'),
    ).toBe(true);
    expect(
      ownedFields(old.editor, 'not_registered', 'not_registered', false).has(
        'format',
      ),
    ).toBe(false);
    expect(
      ownedFields(old.editor, 'test_skew_legacy', 'test_skew_legacy', true).has(
        'anything',
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------

class UnknownNote extends ParagraphNode {
  $config() {
    return this.config('test_unknown_note', {extends: ParagraphNode});
  }
}
class UnknownList extends ListNode {
  $config() {
    return this.config('test_unknown_list', {extends: ListNode});
  }
}
class UnknownLink extends LinkNode {
  $config() {
    return this.config('test_unknown_link', {extends: LinkNode});
  }
}
class UnknownTag extends TextNode {
  $config() {
    return this.config('test_unknown_tag', {extends: TextNode});
  }
}
class UnknownPanel extends ElementNode {
  $config() {
    return this.config('test_unknown_panel', {extends: ElementNode});
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}
class UnknownChip extends DecoratorNode<null> {
  $config() {
    return this.config('test_unknown_chip', {extends: DecoratorNode});
  }
  isInline(): boolean {
    return true;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

describe('S7-11: content of a type a client does not register opens the room read only', () => {
  const withoutLink = NODES.filter(k => k !== LinkNode);
  test.each([
    [
      'a line',
      [UnknownNote],
      NODES,
      () =>
        $getRoot().append(
          $create(UnknownNote).append($createTextNode('note')),
          $p('after'),
        ),
      'test_unknown_note',
    ],
    [
      'a group',
      [UnknownList],
      NODES,
      () => {
        const list = $create(UnknownList);
        list.__listType = 'bullet';
        list.__tag = 'ul';
        $getRoot().append(
          list.append($createListItemNode().append($createTextNode('item'))),
          $p('after'),
        );
      },
      'test_unknown_list',
    ],
    [
      'an inline element stored as a format',
      [UnknownLink],
      NODES,
      () => {
        const link = $create(UnknownLink);
        link.__url = 'https://a.dev';
        $getRoot().append(
          $p('see ').append(link.append($createTextNode('here'))),
          $p('after'),
        );
      },
      'test_unknown_link',
    ],
    [
      'a link, by an editor without LinkNode',
      [],
      withoutLink,
      () =>
        $getRoot().append(
          $p('see ').append(
            $createLinkNode('https://a.dev').append($createTextNode('here')),
          ),
          $p('after'),
        ),
      'link',
    ],
    [
      'a text subclass',
      [UnknownTag],
      NODES,
      () =>
        $getRoot().append(
          $p('plain ').append($create(UnknownTag).setTextContent('tag')),
          $p('after'),
        ),
      'test_unknown_tag',
    ],
    [
      'a block node',
      [UnknownPanel],
      NODES,
      () =>
        $getRoot().append(
          $create(UnknownPanel).append($p('in it')),
          $p('after'),
        ),
      'test_unknown_panel',
    ],
    [
      'an inline node',
      [UnknownChip],
      NODES,
      () =>
        $getRoot().append($p('hi ').append($create(UnknownChip)), $p('after')),
      'test_unknown_chip',
    ],
    [
      'a named slot',
      [UnknownPanel],
      NODES,
      () => {
        const card = $createBoxNode('t').append($p('body'));
        $setSlot(card, 'aside', $create(UnknownPanel).append($p('in a slot')));
        $getRoot().append(card, $p('after'));
      },
      'test_unknown_panel',
    ],
  ] as const)('%s', async (_name, extra, oldNodes, $init, type) => {
    const net = newNet();
    const author = new Peer(2, net as never, [...NODES, ...extra]);
    const old = new Peer(1, net as never, [...oldNodes]);
    author.update(() => {
      $getRoot().clear();
      $init();
    });
    author.binding.initialize();
    await flush();
    expect(old.binding.status).toBe('readonly');
    expect(old.warnings).toEqual([`unregistered node types: ${type}`]);
    const before = docJSON(author);
    const vector = Y.encodeStateVector(old.doc);
    // An edit of the old client is not written.
    old.update(() => {
      const last = $getRoot().getLastChildOrThrow();
      if ($isElementNode(last)) {
        last.append($createTextNode(' more'));
      }
    });
    await flush();
    expect(Y.encodeStateVector(old.doc)).toEqual(vector);
    expect(docJSON(author)).toBe(before);
  });

  test('the warning is typed', async () => {
    const net = newNet();
    const author = new Peer(2, net as never, [...NODES, UnknownLink]);
    const warnings: unknown[] = [];
    const old = new Peer(1, net as never, NODES, editor => {
      editor._onWarn = error => {
        warnings.push(error);
      };
    });
    author.update(() => {
      $getRoot().clear();
      const link = $create(UnknownLink);
      link.__url = 'https://a.dev';
      $getRoot().append($p('see ').append(link.append($createTextNode('x'))));
    });
    author.binding.initialize();
    await flush();
    expect(old.binding.status).toBe('readonly');
    expect(warnings).toMatchObject([
      {
        code: UNKNOWN_NODE_TYPES_WARNING,
        data: {reason: 'unregistered', types: ['test_unknown_link']},
      },
    ]);
  });
});

// ---------------------------------------------------------------------------

// The same rules for a server agent whose config has the older classes: the
// headless helpers write through the same binding.
describe('S7-3, S7-11: a server agent with older classes', () => {
  const quiet = () => {};
  const refusal = (edit: () => void) => {
    try {
      edit();
    } catch (error) {
      return error;
    }
    throw new Error('the edit was not refused');
  };

  test('S7-3: its edit keeps the fields its classes do not declare', () => {
    const seeded = seedYState({nodes: V2, onWarn: quiet}, () =>
      $getRoot().append($card(), $p('after')),
    );
    const {state} = editYState(
      seeded,
      {nodes: V1, onWarn: quiet},
      () => $block([0]).setFormat('center'),
      {writer: null},
    );
    expect(
      readYState(state, {nodes: V2, onWarn: quiet}, () => {
        const card = $block([0]) as CardV2;
        return [card.getFormatType(), card.__tone];
      }),
    ).toEqual(['center', 'warm']);
  });

  test('S7-11: it refuses a document with a link type it does not register', () => {
    const seeded = seedYState(
      {nodes: [...NODES, UnknownLink], onWarn: quiet},
      () => {
        const link = $create(UnknownLink);
        link.__url = 'https://a.dev';
        $getRoot().append($p('see ').append(link.append($createTextNode('x'))));
      },
    );
    const error = refusal(() =>
      editYState(
        seeded,
        {nodes: NODES, onWarn: quiet},
        () => {
          const box = $createBoxNode('t');
          $block([0]).insertBefore(box);
          box.append($block([1]));
        },
        {writer: null},
      ),
    );
    expect(error).toBeInstanceOf(YHeadlessError);
    expect(error).toMatchObject({
      code: 'read-only',
      warnings: [
        {
          code: UNKNOWN_NODE_TYPES_WARNING,
          data: {reason: 'unregistered', types: ['test_unknown_link']},
        },
      ],
    });
  });
});
