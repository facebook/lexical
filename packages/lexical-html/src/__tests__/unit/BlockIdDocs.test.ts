/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// The code examples of the Block IDs documentation page
// (packages/lexical-website/docs/extensions/block-ids.md), as written there,
// type-checked and run. Keep the two in sync.

import {
  $defaultIsIdentifiedBlock,
  $getBlockById,
  $getBlockId,
  $isRootChildBlock,
  BlockIdExtension,
  blockIdState,
  buildEditorFromExtensions,
} from '@lexical/extension';
import {BlockIdHTMLExtension} from '@lexical/html/BlockIdHTMLExtension';
import {RichTextExtension} from '@lexical/rich-text';
import {$isTableCellNode, TableExtension} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setState,
  configExtension,
  type LexicalEditor,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

interface Op {
  op: 'replace' | 'insertAfter' | 'delete';
  id: string;
  text: string;
}

// 2. Applying what the agent answers, as on the page.
function applyOps(editor: LexicalEditor, ops: Op[]): void {
  for (const op of ops) {
    editor.update(
      () => {
        const block = $getBlockById(op.id);
        if (block === null) {
          return; // Deleted meanwhile, or a mistyped id: tell the agent.
        }
        if (op.op === 'delete') {
          block.remove();
        } else {
          const node = $createParagraphNode().append($createTextNode(op.text));
          if (op.op === 'replace') {
            block.replace(node); // Keeps id b7.
            // A selection that ended inside the replaced block lost that end:
            // move it to the new block.
            const selection = $getSelection();
            if (
              $isRangeSelection(selection) &&
              [selection.anchor, selection.focus].some(
                point => !point.getNode().isAttached(),
              )
            ) {
              node.selectEnd();
            }
          } else {
            block.insertAfter(node); // Gets a fresh id.
          }
        }
      },
      {discrete: true},
    );
  }
}

describe('Block IDs documentation examples', () => {
  test('Setup and Addressing blocks', () => {
    // ## Setup
    using editor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, BlockIdExtension],
      name: 'my-editor',
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            ...['seven', 'eight', 'nine'].map(text =>
              $createParagraphNode().append($createTextNode(text)),
            ),
          );
      },
      {discrete: true},
    );

    // 1. What the agent reads (here, the top-level blocks).
    const blocks = editor.read(() =>
      $getRoot()
        .getChildren()
        .map(node => ({id: $getBlockId(node), text: node.getTextContent()})),
    );
    const [b7, b8, b9] = blocks.map(block => block.id!);
    // A person's caret sits inside the block the agent rewrites.
    editor.update(
      () => {
        $getRoot().getAllTextNodes()[0].select(1, 1);
      },
      {discrete: true},
    );

    // 2. What the agent answers.
    const ops: Op[] = [
      {id: b7, op: 'replace', text: 'New text'},
      {id: b7, op: 'insertAfter', text: 'Another paragraph'},
      {id: b9, op: 'delete', text: ''},
    ];
    applyOps(editor, ops);
    const after = editor.read(() =>
      $getRoot()
        .getChildren()
        .map(node => [$getBlockId(node), node.getTextContent()]),
    );
    expect(after.map(([, text]) => text)).toEqual([
      'New text',
      'Another paragraph',
      'eight',
    ]);
    expect(after[0][0]).toBe(b7);
    expect(after[2][0]).toBe(b8);
    expect([b7, b8, b9]).not.toContain(after[1][0]);
    editor.read(() => {
      expect($getBlockById(b9)).toBeNull();
    });

    // Why one update per operation: within one update, a block replaced
    // earlier is not found yet, and a block inserted where a removed block
    // sat takes the removed block's id.
    editor.update(
      () => {
        const again = $createParagraphNode().append($createTextNode('Again'));
        $getBlockById(b7)!.replace(again);
        again.selectEnd(); // The caret was in b7.
        expect($getBlockById(b7)).toBeNull();
        $getBlockById(b8)!.remove();
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Appended')),
        );
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getBlockById(b7)!.getTextContent()).toBe('Again');
      expect($getBlockById(b8)!.getTextContent()).toBe('Appended');
    });

    // $setState(node, blockIdState, 'b7-intro')
    editor.update(
      () => {
        const node = $createParagraphNode();
        $setState(node, blockIdState, 'b7-intro');
        $getRoot().append(node);
      },
      {discrete: true},
    );
    editor.read(() => {
      expect($getBlockById('b7-intro')).not.toBeNull();
    });
  });

  test('Addressing blocks: a selection from or into the replaced block', () => {
    for (const [from, to] of [
      [0, 1],
      [1, 2],
      [2, 1],
      [1, 1],
    ] as const) {
      using editor = buildEditorFromExtensions({
        dependencies: [RichTextExtension, BlockIdExtension],
        name: 'my-editor',
      });
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(
              ...['seven', 'eight', 'nine'].map(text =>
                $createParagraphNode().append($createTextNode(text)),
              ),
            );
        },
        {discrete: true},
      );
      const ids = editor.read(() =>
        $getRoot()
          .getChildren()
          .map(node => $getBlockId(node)!),
      );
      // The person's selection runs from block `from` to block `to`, and
      // the agent replaces the second block.
      editor.update(
        () => {
          const texts = $getRoot().getAllTextNodes();
          texts[from].select(2, 2).focus.set(texts[to].getKey(), 3, 'text');
        },
        {discrete: true},
      );
      applyOps(editor, [{id: ids[1], op: 'replace', text: 'New text'}]);
      editor.read(() => {
        expect(
          $getRoot()
            .getChildren()
            .map(node => [$getBlockId(node), node.getTextContent()]),
          `${from} to ${to}`,
        ).toEqual([
          [ids[0], 'seven'],
          [ids[1], 'New text'],
          [ids[2], 'nine'],
        ]);
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        for (const point of [selection.anchor, selection.focus]) {
          expect(point.getNode().isAttached()).toBe(true);
        }
      });
    }
  });

  test('Headless', () => {
    using writer = buildEditorFromExtensions({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Intro')),
        );
      },
      dependencies: [RichTextExtension],
      name: 'writer',
    });
    writer.read(() => {});
    const storedJSON = JSON.stringify(writer.getEditorState().toJSON());

    using pipeline = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [RichTextExtension, BlockIdExtension],
      name: 'docs-pipeline',
    });

    pipeline.setEditorState(pipeline.parseEditorState(storedJSON));
    const withIds = JSON.stringify(pipeline.getEditorState().toJSON());

    expect(withIds).toMatch(/"blockId":"[A-Za-z0-9_-]{21}"/);
    // Running it again changes nothing.
    pipeline.setEditorState(pipeline.parseEditorState(withIds));
    expect(JSON.stringify(pipeline.getEditorState().toJSON())).toBe(withIds);
  });

  test('Which blocks get ids', () => {
    for (const extension of [
      // Top-level blocks only.
      configExtension(BlockIdExtension, {
        $isIdentifiedBlock: $isRootChildBlock,
      }),

      // The default, plus table cells.
      configExtension(BlockIdExtension, {
        $isIdentifiedBlock: node =>
          $defaultIsIdentifiedBlock(node) || $isTableCellNode(node),
      }),
    ]) {
      using editor = buildEditorFromExtensions({
        dependencies: [RichTextExtension, TableExtension, extension],
        name: 'predicates',
      });
      editor.read(() => {
        expect($getBlockId($getRoot().getFirstChildOrThrow())).not.toBeNull();
      });
    }
  });

  test('HTML and Configuration', () => {
    let n = 0;
    using editor = buildEditorFromExtensions({
      dependencies: [
        RichTextExtension,
        configExtension(BlockIdExtension, {generateId: () => `b${++n}`}),
        configExtension(BlockIdHTMLExtension, {export: false}),
      ],
      name: 'html',
    });
    // The first content of an empty editor is a load (positional ids);
    // later blocks get ids from generateId.
    for (let i = 0; i < 2; i++) {
      editor.update(
        () => {
          $getRoot().append($createParagraphNode());
        },
        {discrete: true},
      );
    }
    editor.read(() => {
      expect($getBlockId($getRoot().getLastChildOrThrow())).toBe('b1');
    });
  });
});
