/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// A generic set-valued NodeState (`setValue`) on the places that store it
// one format per member (text, nodes stored as their own Y.Node) and on a
// line marker, which stores it whole.
// @vitest-environment node

import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getState,
  $getWritableNodeState,
  $isDecoratorNode,
  $isTextNode,
  $setState,
  createState,
  type LexicalEditor,
  type LexicalNode,
  setValue,
  type StateConfig,
  stringValue,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $createEquation,
  $p,
  expectConverged,
  type Peer,
  setup,
  WidgetNode,
} from '../utils/harness';

const tagsState = createState('tags', {parse: setValue(stringValue())});
// Not a member entry of `tags`: a value state whose key contains U+001F.
const lookalikeState = createState('tags\u001fx', {
  parse: (v: unknown) => (typeof v === 'string' ? v : ''),
});
// A set whose own key contains U+001F is stored whole.
const separatorSetState = createState('odd\u001fset', {
  parse: setValue(stringValue()),
});

/** Register the states on the node types used here, as an extension would */
function prepare(editor: LexicalEditor): void {
  editor.update(
    () => {
      for (const node of [
        $createTextNode(),
        $createParagraphNode(),
        $create(WidgetNode),
        $createEquation(''),
      ]) {
        $getWritableNodeState(node);
        for (const state of [tagsState, lookalikeState, separatorSetState]) {
          $getState(node, state as StateConfig<string, unknown>);
        }
      }
    },
    {discrete: true},
  );
}

function $tag(node: LexicalNode, tag: string, on = true): void {
  $setState(node, tagsState, prev => {
    const next = new Set(prev);
    if (on) {
      next.add(tag);
    } else {
      next.delete(tag);
    }
    return next;
  });
}

/** Every node of the document in order, with its tags */
function tags(peer: Peer): string {
  return peer.read(() => {
    const out: string[] = [];
    const visit = (node: LexicalNode) => {
      out.push(`${node.getType()}[${[...$getState(node, tagsState)]}]`);
      if ('getChildren' in node && typeof node.getChildren === 'function') {
        (node.getChildren() as LexicalNode[]).forEach(visit);
      }
    };
    $getRoot().getChildren().forEach(visit);
    return out.join(' ');
  });
}

/**
 * Every NodeState key in the root sequence, by where it is stored: `text`
 * (text formats), `¶` (line markers), or the stored node's name.
 */
function storedStateKeys(peer: Peer): Record<string, string[]> {
  const keys: Record<string, Set<string>> = {};
  const add = (where: string, attrs: Record<string, unknown> | undefined) => {
    for (const key of Object.keys(attrs || {})) {
      if (key.startsWith('s:')) {
        (keys[where] = keys[where] || new Set()).add(key);
      }
    }
  };
  // Through JSON text: nested nodes are plain only once stringified.
  const delta = JSON.parse(JSON.stringify(peer.binding.root.toDelta()));
  const children = delta.children as {
    insert?: unknown;
    format?: Record<string, unknown>;
  }[];
  for (const child of children) {
    if (typeof child.insert === 'string') {
      add('text', child.format);
    } else if (Array.isArray(child.insert)) {
      for (const node of child.insert as {
        name: string;
        attrs?: Record<string, unknown>;
      }[]) {
        add(node.name, node.attrs);
      }
    }
  }
  const out: Record<string, string[]> = {};
  for (const where of Object.keys(keys).sort()) {
    out[where] = Array.from(keys[where]).sort();
  }
  return out;
}

const $init = () => {
  $getRoot().append($p('ab').append($createEquation('x')), $create(WidgetNode));
};

const $leaves = () => {
  const [paragraph, widget] = $getRoot().getChildren();
  const [text, equation] = (
    paragraph as unknown as {getChildren(): LexicalNode[]}
  ).getChildren();
  if (!$isTextNode(text) || !$isDecoratorNode(equation)) {
    throw new Error('unexpected document');
  }
  return {equation, paragraph, text, widget};
};

describe.each([[[1, 2]], [[2, 1]]])('setValue state, ids %j', ids => {
  test('concurrent additions merge on text and stored nodes', async () => {
    const t = await setup($init, {ids, prepare});
    t.offline();
    t.a.update(() => {
      const {equation, text, widget} = $leaves();
      [text, equation, widget].forEach(n => $tag(n, 'a'));
    });
    t.b.update(() => {
      const {equation, text, widget} = $leaves();
      [text, equation, widget].forEach(n => $tag(n, 'b'));
    });
    await t.sync();
    await expectConverged(t.peers);
    for (const peer of t.peers) {
      expect(tags(peer)).toBe(
        'paragraph[] text[a,b] test_equation[a,b] test_widget[a,b]',
      );
      const members = ['s:tags\u001fa', 's:tags\u001fb'];
      expect(storedStateKeys(peer)).toEqual({
        'b:test_widget': members,
        'i:test_equation': members,
        text: members,
      });
      expect(peer.warnings).toEqual([]);
    }
  });

  test('a removal and a concurrent addition both apply', async () => {
    const t = await setup(
      () => {
        $init();
        const {equation, text, widget} = $leaves();
        [text, equation, widget].forEach(n => $tag(n, 'a'));
      },
      {ids, prepare},
    );
    t.offline();
    t.a.update(() => {
      const {equation, text, widget} = $leaves();
      [text, equation, widget].forEach(n => $tag(n, 'a', false));
    });
    t.b.update(() => {
      const {equation, text, widget} = $leaves();
      [text, equation, widget].forEach(n => $tag(n, 'c'));
    });
    await t.sync();
    await expectConverged(t.peers);
    for (const peer of t.peers) {
      expect(tags(peer)).toBe(
        'paragraph[] text[c] test_equation[c] test_widget[c]',
      );
    }
  });

  test('a paragraph stores the set as one value', async () => {
    const t = await setup($init, {ids, prepare});
    t.offline();
    t.a.update(() => $tag($leaves().paragraph, 'a'));
    t.b.update(() => $tag($leaves().paragraph, 'b'));
    await t.sync();
    await expectConverged(t.peers);
    const result = tags(t.a);
    expect([
      'paragraph[a] text[] test_equation[] test_widget[]',
      'paragraph[b] text[] test_equation[] test_widget[]',
    ]).toContain(result);
    for (const peer of t.peers) {
      expect(tags(peer)).toBe(result);
      expect(storedStateKeys(peer)).toEqual({'¶': ['s:tags']});
    }
  });
});

describe('keys that contain U+001F', () => {
  test('a value state is not read as a member of a set', async () => {
    const t = await setup($init, {prepare});
    t.a.update(() => $setState($leaves().text, lookalikeState, 'v'));
    await t.sync();
    for (const peer of t.peers) {
      expect(storedStateKeys(peer)).toEqual({text: ['s:tags\u001fx']});
      peer.read(() => {
        const {text} = $leaves();
        expect($getState(text, lookalikeState)).toBe('v');
        expect([...$getState(text, tagsState)]).toEqual([]);
      });
    }
  });

  test('a set-valued state is stored whole', async () => {
    const t = await setup($init, {prepare});
    t.a.update(() =>
      $setState($leaves().text, separatorSetState, new Set(['b', 'a'])),
    );
    await t.sync();
    for (const peer of t.peers) {
      expect(storedStateKeys(peer)).toEqual({text: ['s:odd\u001fset']});
      peer.read(() => {
        expect(
          [...$getState($leaves().text, separatorSetState)].sort(),
        ).toEqual(['a', 'b']);
      });
      expect(peer.warnings).toEqual([]);
    }
  });
});
