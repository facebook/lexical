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
  $getBlockHandle,
  $getBlockHandles,
  $getBlockId,
  $isRootChildBlock,
  $resolveBlockHandle,
  BlockIdExtension,
  blockIdState,
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
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
  test('Showing blocks to a model', () => {
    const ids = ['V1StGXR8_Z5jdHi6B-myT', '9xQeLm2Pq0aK7cTb_wYuA'];
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        for (const [i, text] of ['Q3 plan', 'Revenue grew 4%.'].entries()) {
          const node = $createParagraphNode().append($createTextNode(text));
          $setState(node, blockIdState, ids[i]);
          $getRoot().append(node);
        }
      },
      dependencies: [RichTextExtension, BlockIdExtension],
      name: 'my-editor',
    });

    // 1. What the model reads.
    const blocks = editor.read(() =>
      $getRoot()
        .getChildren()
        .map(node => ({
          block: $getBlockHandle(node),
          text: node.getTextContent(),
        })),
    );
    expect(blocks).toEqual([
      {block: 'V1St', text: 'Q3 plan'},
      {block: '9xQe', text: 'Revenue grew 4%.'},
    ]);

    // 2. What the model answers, then 3. applying it, in its own update.
    const feedback: string[] = [];
    const apply = (op: {block: string; text: string}) =>
      editor.update(
        () => {
          const result = $resolveBlockHandle(op.block);
          switch (result.status) {
            case 'found':
              result.node.replace(
                $createParagraphNode().append($createTextNode(op.text)),
              );
              break;
            case 'not-found':
              feedback.push(
                `No block ${result.handle}: it may have been deleted.`,
              );
              break;
            case 'ambiguous':
              feedback.push(
                `${result.handle} now names several blocks: use one of ${result.candidates.join(', ')}.`,
              );
              break;
            case 'invalid':
              feedback.push(`${result.handle} is not a block handle.`);
              break;
          }
        },
        {discrete: true},
      );
    apply({block: '9xQe', text: 'Revenue grew 6%.'});
    apply({block: '9xQf', text: 'typo'});
    apply({block: '9xQe!', text: 'invalid'});
    // A collaborator adds a block whose id shares V1St.
    editor.update(
      () => {
        const node = $createParagraphNode();
        $setState(node, blockIdState, 'V1StQ9mWc0-bE3rT7yLpA');
        $getRoot().append(node);
      },
      {discrete: true},
    );
    apply({block: 'V1St', text: 'stale'});
    expect(feedback).toEqual([
      'No block 9xQf: it may have been deleted.',
      '9xQe! is not a block handle.',
      'V1St now names several blocks: use one of V1StG, V1StQ.',
    ]);
    editor.read(() => {
      expect($getBlockById(ids[1])!.getTextContent()).toBe('Revenue grew 6%.');
      expect($getBlockHandle($getBlockById(ids[0])!)).toBe('V1StG');
    });
  });

  test('Handles and collaboration: checking the id read', () => {
    const ids = ['abcd1111', 'wxyz2222'];
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        for (const id of ids) {
          const node = $createParagraphNode().append($createTextNode(id));
          $setState(node, blockIdState, id);
          $getRoot().append(node);
        }
      },
      dependencies: [RichTextExtension, BlockIdExtension],
      name: 'my-editor',
    });
    // At the read.
    const handleOf = editor.read(() => $getBlockHandles()); // id → handle
    const idOf = new Map(Array.from(handleOf, ([id, handle]) => [handle, id]));
    expect(idOf.get('abcd')).toBe('abcd1111');
    // The block is deleted and a block whose id shares its prefix is added.
    editor.update(
      () => {
        $getBlockById('abcd1111')!.remove();
        const node = $createParagraphNode();
        $setState(node, blockIdState, 'abcd2222');
        $getRoot().append(node);
      },
      {discrete: true},
    );
    const op = {block: 'abcd'};
    // When applying an edit by handle.
    editor.update(
      () => {
        const result = $resolveBlockHandle(op.block);
        expect(result.status).toBe('found');
        if (
          result.status === 'found' &&
          $getBlockId(result.node) === idOf.get(op.block)
        ) {
          result.node.remove();
        }
      },
      {discrete: true},
    );
    // The new block was not the one read: it is kept.
    editor.read(() => {
      expect($getBlockById('abcd2222')).not.toBeNull();
    });
  });

  test('Handles in HTML', () => {
    using editor = buildEditorFromExtensions({
      dependencies: [
        RichTextExtension,
        BlockIdExtension,
        configExtension(BlockIdHTMLExtension, {export: 'handle'}),
      ],
      name: 'my-editor',
    });
    expect(
      getExtensionDependencyFromEditor(editor, BlockIdHTMLExtension).output
        .export.value,
    ).toBe('handle');
  });
});
