/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// An editor can show something other than the document when a remote change
// arrives: an update tagged SKIP_COLLAB_TAG is not written, by design. A
// read then places what it reads by the binding's units, never next to a
// node it moves while reading (S7-25: a paragraph stored in a quote's line,
// moved out of the quote by such an update, was taken back into the quote by
// the read of a block inserted before it, and the quote was placed after
// that paragraph, inside itself: Lexical's next walk up the tree never
// ended, and the tab hung). A read that would still place a node inside
// itself, as a child or as a named slot's value, throws instead: the binding
// warns and reads the document again.

import {
  BlockIdExtension,
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {$createQuoteNode, RichTextExtension} from '@lexical/rich-text';
import * as Y from '@y/y';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $removeSlot,
  $setSlot,
  configExtension,
  defineExtension,
  ElementNode,
  type LexicalEditorWithDispose,
  SKIP_COLLAB_TAG,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  createYDoc,
  isYWarning,
  RECOVERED_READ_WARNING,
  type YBinding,
  YCollabExtension,
} from '../..';
import {
  $createBoxNode,
  $createEquation,
  $p,
  BoxNode,
  describeNode,
  EquationNode,
  flush,
} from '../utils/harness';

/** A block container with two named slots. */
class ChannelNode extends ElementNode {
  $config() {
    return this.config('test_channel', {
      children: 'block',
      extends: ElementNode,
      slots: ['body', 'title'],
    });
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
}

const RELAY = {relay: true};

type Client = {
  binding: YBinding;
  doc: Y.Doc;
  editor: LexicalEditorWithDispose;
  warnings: unknown[];
};

/** Clients that relay every update to each other at once. */
function clients(
  n: number,
  blockIds: boolean,
  {selfCheck = true}: {selfCheck?: boolean} = {},
): Client[] {
  const all: Client[] = [];
  for (let i = 0; i < n; i++) {
    const doc = createYDoc(null, {gc: false});
    doc.clientID = i + 1;
    const warnings: unknown[] = [];
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          RichTextExtension,
          configExtension(YCollabExtension, {doc, selfCheck}),
          ...(blockIds ? [BlockIdExtension] : []),
        ],
        name: `@lexical/y/test/drift-${i}`,
        nodes: () => [BoxNode, ChannelNode, EquationNode],
        onWarn: warning => {
          warnings.push(warning);
        },
      }),
    );
    const {binding} = getExtensionDependencyFromEditor(
      editor,
      YCollabExtension,
    ).output;
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== RELAY) {
        for (const other of all) {
          if (other.doc !== doc) {
            Y.applyUpdate(other.doc, update, RELAY);
          }
        }
      }
    });
    all.push({binding, doc, editor, warnings});
  }
  return all;
}

const show = (c: Client) =>
  c.editor.read(() => $getRoot().getChildren().map(describeNode).join(' / '));

/**
 * The binding's RECOVERED_READ_WARNINGs: their reason, and whether the read
 * refused to place a node inside itself.
 */
const recovered = (warnings: unknown[]) =>
  warnings
    .filter(isYWarning)
    .filter(warning => warning.code === RECOVERED_READ_WARNING)
    .map(warning => [
      (warning.data as {reason: string}).reason,
      warning.message.includes('a read would place a node inside itself'),
    ]);

describe.each([false, true])('blockIds %s', blockIds => {
  test('a block inserted before a quote whose paragraph a skipped update moved out (S7-25)', async () => {
    const [a, b] = clients(2, blockIds);
    b.editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $p('one'),
            $createQuoteNode({shadowRoot: true}).append($p('inner')),
          );
      },
      {discrete: true},
    );
    b.binding.initialize();
    await flush();
    expect(show(a)).toBe('paragraph("one") / quote(paragraph("inner"))');
    a.editor.update(
      () => {
        const quote = $getRoot().getChildAtIndex(1) as ElementNode;
        quote.insertBefore(quote.getFirstChildOrThrow());
      },
      {discrete: true, tag: SKIP_COLLAB_TAG},
    );
    expect(show(a)).toBe('paragraph("one") / paragraph("inner") / quote()');
    b.editor.update(
      () => {
        ($getRoot().getChildAtIndex(1) as ElementNode).insertBefore(
          $p('before'),
        );
      },
      {discrete: true},
    );
    await flush();
    const expected =
      'paragraph("one") / paragraph("before") / quote(paragraph("inner"))';
    expect(show(b)).toBe(expected);
    expect(show(a)).toBe(expected);
    expect(a.warnings).toEqual([]);
    a.editor.dispose();
    b.editor.dispose();
  });

  test('a block inserted before a box that a skipped update made hold the box storing it: read again, with a warning', async () => {
    const [a, b] = clients(2, blockIds);
    b.editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $p('top'),
            $createBoxNode('c').append(
              $p('c1'),
              $createBoxNode('d').append($p('d1')),
              $p('c2'),
            ),
          );
      },
      {discrete: true},
    );
    b.binding.initialize();
    await flush();
    // Box d moves out of box c, and c into d: the content that stores d is
    // now inside d.
    a.editor.update(
      () => {
        const c = $getRoot().getChildAtIndex(1) as ElementNode;
        const d = c.getChildAtIndex(1) as ElementNode;
        c.insertBefore(d);
        d.append(c);
      },
      {discrete: true, tag: SKIP_COLLAB_TAG},
    );
    expect(show(a)).toBe(
      'paragraph("top") / test_box[d](paragraph("d1") test_box[c](paragraph("c1") paragraph("c2")))',
    );
    b.editor.update(
      () => {
        const c = $getRoot().getChildAtIndex(1) as ElementNode;
        c.getChildAtIndex(1)!.insertBefore($p('new'));
      },
      {discrete: true},
    );
    await flush();
    const expected =
      'paragraph("top") / test_box[c](paragraph("c1") paragraph("new") test_box[d](paragraph("d1")) paragraph("c2"))';
    expect(show(b)).toBe(expected);
    expect(show(a)).toBe(expected);
    expect(recovered(a.warnings)).toEqual([['remote-change', true]]);
    a.editor.dispose();
    b.editor.dispose();
  });
  test('a block inserted after a run whose last node a skipped update moved: placed after what stays', async () => {
    // Without the self-check, which reads such a container again.
    const [a, b] = clients(2, blockIds, {selfCheck: false});
    b.editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createBoxNode('c').append(
              $p('left'),
              $createEquation('a'),
              $createEquation('b'),
              $p('target'),
              $createBoxNode('e').append($p('else')),
            ),
          );
      },
      {discrete: true},
    );
    b.binding.initialize();
    await flush();
    a.editor.update(
      () => {
        const c = $getRoot().getFirstChildOrThrow() as ElementNode;
        (c.getLastChild() as ElementNode).append(c.getChildAtIndex(2)!);
      },
      {discrete: true, tag: SKIP_COLLAB_TAG},
    );
    b.editor.update(
      () => {
        const c = $getRoot().getFirstChildOrThrow() as ElementNode;
        c.getChildAtIndex(3)!.insertBefore($p('new'));
      },
      {discrete: true},
    );
    await flush();
    expect(show(a)).toBe(
      'test_box[c](paragraph("left") eq[a] paragraph("new") paragraph("target") test_box[e](paragraph("else") eq[b]))',
    );
    expect(a.warnings).toEqual([]);
    a.editor.dispose();
    b.editor.dispose();
  });

  test("a slot restored on a host that a skipped update moved into that slot's value: read again, with a warning", async () => {
    const [a, b] = clients(2, blockIds);
    const $text = (text: string) =>
      $createParagraphNode().append($createTextNode(text));
    b.editor.update(
      () => {
        const host = $create(ChannelNode);
        $setSlot(host, 'body', $create(ChannelNode).append($text('body')));
        $getRoot().clear().append(host);
      },
      {discrete: true},
    );
    b.binding.initialize();
    await flush();
    // The body leaves its slot, and the host moves into it.
    a.editor.update(
      () => {
        const host = $getRoot().getFirstChildOrThrow() as ChannelNode;
        const body = $getSlot(host, 'body') as ChannelNode;
        $removeSlot(host, 'body');
        host.insertBefore(body);
        body.append(host);
      },
      {discrete: true, tag: SKIP_COLLAB_TAG},
    );
    // Setting another slot reads the host's slots again, the body included.
    b.editor.update(
      () => {
        const host = $getRoot().getFirstChildOrThrow() as ChannelNode;
        $setSlot(host, 'title', $create(ChannelNode).append($text('title')));
      },
      {discrete: true},
    );
    await flush();
    const slots = (c: Client) =>
      c.editor.read(() => {
        const host = $getRoot().getFirstChildOrThrow() as ChannelNode;
        return [
          $getRoot().getChildrenSize(),
          host.getType(),
          $getSlot(host, 'body')?.getTextContent(),
          $getSlot(host, 'title')?.getTextContent(),
        ];
      });
    expect(slots(b)).toEqual([1, 'test_channel', 'body', 'title']);
    expect(slots(a)).toEqual(slots(b));
    expect(recovered(a.warnings)).toEqual([['remote-change', true]]);
    a.editor.dispose();
    b.editor.dispose();
  });
});
