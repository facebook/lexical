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
} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getState,
  $setState,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {createYDoc, YBinding, YCollabExtension} from '../..';

// The follow-up check (YBinding#$checkFollowUp) reads only the part of a
// container the follow-up changed: in a long document, a follow-up after
// each keystroke (BlockIdExtension's naming path) costs that part, not the
// document. So the check costs about the same in a document ten times
// longer; measured in the same process, the comparison holds on a loaded
// machine, where an absolute bound in milliseconds does not.

const BLOCKS = 10000;
const SMALL = 1000;
const KEYS = 60;

type Check = (this: YBinding, ...args: unknown[]) => void;
const proto = YBinding.prototype as unknown as {$checkFollowUp: Check};
const original = proto.$checkFollowUp;

function build(blocks: number): {editor: LexicalEditor; binding: YBinding} {
  const doc = createYDoc();
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(YCollabExtension, {doc, schemaVersion: 1}),
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
      for (let i = 0; i < blocks; i++) {
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

/**
 * A keystroke (a character typed at the end of block `at`), then a
 * follow-up that renames that block, as BlockIdExtension's naming update
 * does: tagged as it, in an update of its own. Returns the follow-up's time.
 */
function keystroke(editor: LexicalEditor, at: number, k: number): number {
  editor.update(
    () => {
      const line = $getRoot().getChildAtIndex(at) as ElementNode;
      line.selectEnd().insertText('x');
    },
    {discrete: true},
  );
  const t0 = performance.now();
  editor.update(
    () => {
      $setState($getRoot().getChildAtIndex(at)!, blockIdState, `renamed-${k}`);
    },
    {discrete: true, tag: 'block-id-repair'},
  );
  return performance.now() - t0;
}

function run(where: 'end' | 'middle', withCheck: boolean, blocks = BLOCKS) {
  const {editor} = build(blocks);
  let checks = 0;
  let checkMs = 0;
  proto.$checkFollowUp = function (this: YBinding, ...args: unknown[]) {
    checks++;
    if (!withCheck) {
      return;
    }
    const t0 = performance.now();
    original.apply(this, args);
    checkMs += performance.now() - t0;
  };
  const times: number[] = [];
  try {
    for (let k = 0; k < KEYS; k++) {
      const at = where === 'end' ? blocks - 1 : blocks / 2;
      times.push(keystroke(editor, at, k));
    }
  } finally {
    proto.$checkFollowUp = original;
  }
  times.sort((a, b) => a - b);
  // Every rename was written (none read again).
  const stored = editor.read(() => {
    const at = where === 'end' ? blocks - 1 : blocks / 2;
    return $getState($getRoot().getChildAtIndex(at)!, blockIdState);
  });
  (editor as LexicalEditor & {dispose: () => void}).dispose();
  return {
    checkMs: checkMs / KEYS,
    checks,
    median: times[times.length >> 1],
    stored,
  };
}

describe('the follow-up check in a long document', () => {
  for (const where of ['end', 'middle'] as const) {
    test(`${BLOCKS} blocks, ${KEYS} keystrokes at the ${where}, each followed by a naming update: the check costs the part it changed`, () => {
      const off = run(where, false);
      const on = run(where, true);
      const small = run(where, true, SMALL);
      // eslint-disable-next-line no-console
      console.log(
        `FOLLOWUP_COST ${where}: ${on.checks} follow-ups checked; median follow-up ${off.median.toFixed(2)} ms without the check, ${on.median.toFixed(2)} ms with it; the check ${on.checkMs.toFixed(3)} ms per follow-up, ${small.checkMs.toFixed(3)} ms in ${SMALL} blocks`,
      );
      expect(on.checks).toBe(KEYS);
      expect(on.stored).toBe(`renamed-${KEYS - 1}`);
      expect(small.stored).toBe(`renamed-${KEYS - 1}`);
      // The check reads a few blocks, not the 10,000: ten times the blocks
      // would cost about ten times as much.
      expect(on.checkMs).toBeLessThan(5 * small.checkMs + 0.5);
    }, 120000);
  }
});
