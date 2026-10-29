/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

import {
  BlockIdExtension,
  blockIdState,
  buildEditorFromExtensions,
  configExtension,
  defineExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import * as Y from '@y/y';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getState,
  $setState,
  type ElementNode,
  ParagraphNode,
} from 'lexical';
import {describe, expect, onTestFinished, test, vi} from 'vitest';

import {YBinding, YCollabExtension} from '../..';

// The follow-up check (YBinding#$checkFollowUp) reads only the part of a
// container the follow-up changed: in a long document, a follow-up after
// each keystroke (BlockIdExtension's naming path) costs that part, not the
// document.

const BLOCKS = 10000;
const KEYS = 3;

type Check = (this: YBinding, ...args: unknown[]) => void;
const proto = YBinding.prototype as unknown as {$checkFollowUp: Check};
const original = proto.$checkFollowUp;

function build(): {editor: LexicalEditorWithDispose; binding: YBinding} {
  const doc = new Y.Doc();
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(YCollabExtension, {doc}),
        BlockIdExtension,
      ],
      name: '@lexical/y/test/follow-up-cost',
      namespace: 'follow-up-cost',
      onError: e => {
        throw e;
      },
    }),
  );
  const {binding} = getExtensionDependencyFromEditor(
    editor,
    YCollabExtension,
  ).output;
  editor.update(
    () => {
      const root = $getRoot().clear();
      for (let i = 0; i < BLOCKS; i++) {
        root.append(
          $createParagraphNode().append($createTextNode(`line ${i} of text`)),
        );
      }
    },
    {discrete: true},
  );
  binding.initialize();
  return {binding, editor};
}

describe('the follow-up check in a long document', () => {
  for (const where of ['end', 'middle'] as const) {
    test(`${BLOCKS} blocks: a naming follow-up at the ${where} reads only nearby paragraphs`, () => {
      const {editor} = build();
      onTestFinished(() => editor.dispose());
      const exported = vi.spyOn(ParagraphNode.prototype, 'exportJSON');
      onTestFinished(() => exported.mockRestore());
      let checks = 0;
      const check = vi
        .spyOn(proto, '$checkFollowUp')
        .mockImplementation(function (this: YBinding, ...args: unknown[]) {
          const before = exported.mock.calls.length;
          original.apply(this, args);
          // Count work instead of timing it on a shared runner. A whole-root
          // read exports 10,000 paragraphs; a region reads its neighbours.
          expect(exported.mock.calls.length - before).toBeGreaterThan(0);
          expect(exported.mock.calls.length - before).toBeLessThanOrEqual(12);
          checks++;
        });
      onTestFinished(() => check.mockRestore());
      const at = where === 'end' ? BLOCKS - 1 : BLOCKS / 2;
      for (let k = 0; k < KEYS; k++) {
        editor.update(
          () => {
            const line = $getRoot().getChildAtIndex(at) as ElementNode;
            line.selectEnd().insertText('x');
          },
          {discrete: true},
        );
        editor.update(
          () => {
            $setState(
              $getRoot().getChildAtIndex(at)!,
              blockIdState,
              `renamed-${k}`,
            );
          },
          {discrete: true, tag: 'block-id-repair'},
        );
      }
      expect(checks).toBe(KEYS);
      expect(
        editor.read(() =>
          $getState($getRoot().getChildAtIndex(at)!, blockIdState),
        ),
      ).toBe(`renamed-${KEYS - 1}`);
    });
  }
});
