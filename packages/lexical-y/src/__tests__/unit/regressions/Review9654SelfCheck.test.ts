/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node
import * as Y from '@y/y';
import {$create, $createParagraphNode, $getRoot, createEditor} from 'lexical';
import {expect, test} from 'vitest';

import {RUN_END} from '../../../internal/Schema';
import {$checkWrite} from '../../../internal/SelfCheck';
import {type Writer} from '../../../internal/Write';
import {EquationNode, NODES, WidgetNode} from '../../utils/harness';
// #9571: the self-check skips a stored wrapper over a block only in a shadow
// root (the reader shows such a block without it); elsewhere a wrapper the
// writer failed to remove is still reported, also after a block.
for (const nodes of [
  'inline-only',
  'block-only',
  'block-then-inline',
  'inline-then-block',
]) {
  test(`self-check must reject a missing visible wrapper: ${nodes}`, () => {
    const editor = createEditor({
      nodes: NODES,
      onError: e => {
        throw e;
      },
    });
    const doc = new Y.Doc({gc: false});
    doc.cleanupFormatting = false;
    const root = doc.get('audit');
    const names =
      nodes === 'inline-only'
        ? ['test_equation']
        : nodes === 'block-only'
          ? ['test_widget']
          : nodes === 'block-then-inline'
            ? ['test_widget', 'test_equation']
            : ['test_equation', 'test_widget'];
    let end: Y.Item;
    doc.transact(() => {
      for (const [at, name] of names.entries())
        root.insert(at, [new Y.Node('i:' + name)], {
          'w:link': {url: 'https://should-be-visible.example'},
        });
      root.insert(names.length, [new Y.Node(RUN_END)]);
      for (let it = root._start; it; it = it.right)
        if (
          it.content instanceof Y.ContentType &&
          it.content.type.name === RUN_END
        )
          end = it;
    });
    editor.update(
      () => {
        const ns = names.map(name =>
          name === 'test_widget' ? $create(WidgetNode) : $create(EquationNode),
        );
        // Deliberate fault injection: a writer fails to persist the author's
        // removal of a visible link. No shadow root in this editor/unit.
        $getRoot().append($createParagraphNode().append(...ns));
        const writer = {
          $ctx: () => ({
            cursor: null,
            cursorAt: -1,
            segments: {create: () => null, get: () => undefined},
          }),
          formatAsStored: (_key: string, value: unknown) => value,
          state: {editor, hidden: null, segments: new Map()},
          textFields: () => new Set(),
          touched: [
            {
              d: {kind: 'run', nodes: ns},
              unit: {cs: {y: root}, end: end!, key: 'audit', start: new Map()},
            },
          ],
          wrapperFields: () => new Set(['url']),
        } as unknown as Writer;
        const problems = $checkWrite(writer);
        expect(problems.some(p => p.includes('format w:link'))).toBe(true);
      },
      {discrete: true},
    );
    doc.destroy();
  });
}
