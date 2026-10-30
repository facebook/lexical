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
import {$createLinkNode, $isLinkNode, LinkExtension} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {$isTableCellNode, TableExtension} from '@lexical/table';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSlot,
  $setState,
  configExtension,
  DecoratorNode,
  defineExtension,
  type LexicalEditor,
} from 'lexical';
import fs from 'node:fs';
import {assert, describe, expect, test} from 'vitest';

import {$setBlockText} from '../utils/setBlockText';

/** An inline decorator without text. */
class EmptyInlineNode extends DecoratorNode<null> {
  $config() {
    return this.config('block-id-docs-empty-inline', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    throw new Error('headless only');
  }
  updateDOM(): false {
    return false;
  }
  isInline(): true {
    return true;
  }
  decorate(): null {
    return null;
  }
}

const EmptyInlineExtension = defineExtension({
  name: 'block-id-docs/empty-inline',
  nodes: () => [EmptyInlineNode],
});

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

    // 1. What the model reads, and the handles it is shown (id → handle).
    const [blocks, shown] = editor.read(() => [
      $getRoot()
        .getChildren()
        .map(node => ({
          block: $getBlockHandle(node),
          text: node.getTextContent(),
        })),
      $getBlockHandles(),
    ]);
    expect(blocks).toEqual([
      {block: 'V1St', text: 'Q3 plan'},
      {block: '9xQe', text: 'Revenue grew 4%.'},
    ]);
    const keyBefore = editor.read(() => $getBlockById(ids[1])!.getKey());

    // 2. What the model answers, then 3. applying it, in its own update.
    const feedback: string[] = [];
    const apply = (op: {block: string; text: string}) =>
      editor.update(
        () => {
          const result = $resolveBlockHandle(op.block, {read: shown});
          switch (result.status) {
            case 'found':
              if (!$setBlockText(result.node, op.text)) {
                feedback.push(
                  `${op.block} holds line breaks or other blocks: edit its parts.`,
                );
              }
              break;
            case 'not-found':
              feedback.push(
                `No block ${result.handle}: it may have been deleted.`,
              );
              break;
            case 'ambiguous':
              feedback.push(
                `${result.handle} names several blocks: use one of ${result.candidates.join(', ')}.`,
              );
              break;
            case 'invalid':
              feedback.push(
                result.reason === 'too-short'
                  ? `${result.handle} is too short: block handles have at least 4 characters.`
                  : `${result.handle} is not a block handle.`,
              );
              break;
          }
        },
        {discrete: true},
      );
    apply({block: '9xQe', text: 'Revenue grew 6%.'});
    editor.read(() => {
      const block = $getBlockById(ids[1])!;
      expect(block.getTextContent()).toBe('Revenue grew 6%.');
      // Changed in place: the same block, not a new one.
      expect(block.getKey()).toBe(keyBefore);
    });
    apply({block: '9xQf', text: 'typo'});
    apply({block: '9xQ', text: 'too short'});
    apply({block: '9xQe!', text: 'invalid'});
    // A collaborator adds a block whose id shares V1St: the handle still
    // names the block the model read.
    editor.update(
      () => {
        const node = $createParagraphNode();
        $setState(node, blockIdState, 'V1StQ9mWc0-bE3rT7yLpA');
        $getRoot().append(node);
      },
      {discrete: true},
    );
    apply({block: 'V1St', text: 'Q4 plan'});
    // And deletes the other one.
    editor.update(
      () => {
        $getBlockById(ids[1])!.remove();
      },
      {discrete: true},
    );
    apply({block: '9xQe', text: 'Revenue grew 7%.'});
    // A paragraph with a line break is not changed in place.
    editor.update(
      () => {
        const block = $getBlockById(ids[0]);
        assert($isElementNode(block));
        block.append($createLineBreakNode());
      },
      {discrete: true},
    );
    apply({block: 'V1St', text: 'Q5 plan'});
    expect(feedback).toEqual([
      'No block 9xQf: it may have been deleted.',
      '9xQ is too short: block handles have at least 4 characters.',
      '9xQe! is not a block handle.',
      'No block 9xQe: it may have been deleted.',
      'V1St holds line breaks or other blocks: edit its parts.',
    ]);
    editor.read(() => {
      expect($getBlockById(ids[0])!.getTextContent()).toBe('Q4 plan\n');
    });
  });

  test('Showing blocks to a model: $setBlockText refuses blocks that are not just text', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [
        RichTextExtension,
        ListExtension,
        BlockIdExtension,
        EmptyInlineExtension,
      ],
      name: 'set-block-text-refuses',
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('a'),
              $createLineBreakNode(),
              $createTextNode('b'),
            ),
            $createListNode('bullet').append(
              $createListItemNode().append($createTextNode('one')),
              $createListItemNode().append($createTextNode('two')),
            ),
            // One item: the list's text is its item's text.
            $createListNode('number').append(
              $createListItemNode().append($createTextNode('one')),
            ),
            // An inline decorator without text.
            $createParagraphNode().append(
              $createTextNode('left'),
              new EmptyInlineNode(),
              $createTextNode('right'),
            ),
          );
      },
      {discrete: true},
    );
    const before = editor.read(() => JSON.stringify(editor.getEditorState()));
    editor.update(
      () => {
        const [lineBreak, list, oneItem, decorated] = $getRoot().getChildren();
        expect($setBlockText(lineBreak, 'a\nb')).toBe(false);
        expect($setBlockText(lineBreak, '')).toBe(false);
        expect($setBlockText(list, 'one\n\ntwo')).toBe(false);
        expect(oneItem.getTextContent()).toBe('one');
        expect($setBlockText(oneItem, 'rewritten')).toBe(false);
        expect(decorated.getTextContent()).toBe('leftright');
        expect($setBlockText(decorated, 'changed')).toBe(false);
      },
      {discrete: true},
    );
    // Nothing changed.
    expect(editor.read(() => JSON.stringify(editor.getEditorState()))).toBe(
      before,
    );
  });

  test('Showing blocks to a model: $setBlockText refuses a block or inline element that hosts a slot', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [RichTextExtension, LinkExtension, BlockIdExtension],
      name: 'set-block-text-slots',
    });
    editor.update(
      () => {
        // A text-only block whose caption slot holds a line break.
        const host = $createParagraphNode().append($createTextNode('body'));
        $setSlot(
          host,
          'caption',
          $createParagraphNode().append(
            $createTextNode('a'),
            $createLineBreakNode(),
            $createTextNode('b'),
          ),
        );
        // A link, inline, that hosts a slot.
        const link = $createLinkNode('https://example.com').append(
          $createTextNode('link'),
        );
        $setSlot(
          link,
          'note',
          $createParagraphNode().append($createTextNode('note')),
        );
        $getRoot()
          .clear()
          .append(
            host,
            $createParagraphNode().append($createTextNode('see '), link),
          );
      },
      {discrete: true},
    );
    const before = editor.read(() => JSON.stringify(editor.getEditorState()));
    editor.update(
      () => {
        const [host, withLink] = $getRoot().getChildren();
        expect($setBlockText(host, host.getTextContent())).toBe(false);
        expect($setBlockText(host, 'changed')).toBe(false);
        expect($setBlockText(withLink, withLink.getTextContent())).toBe(false);
        expect($setBlockText(withLink, 'see changed')).toBe(false);
      },
      {discrete: true},
    );
    expect(editor.read(() => JSON.stringify(editor.getEditorState()))).toBe(
      before,
    );
  });

  test('Showing blocks to a model: $setBlockText edits text in inline elements', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [RichTextExtension, LinkExtension, BlockIdExtension],
      name: 'set-block-text-link',
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('See '),
              $createLinkNode('https://example.com').append(
                $createTextNode('the plan'),
              ),
              $createTextNode(' for Q3.'),
            ),
          );
      },
      {discrete: true},
    );
    for (const text of [
      'See the new plan for Q3.',
      'See the new plan for Q4.',
    ]) {
      editor.update(
        () => {
          expect($setBlockText($getRoot().getFirstChildOrThrow(), text)).toBe(
            true,
          );
        },
        {discrete: true},
      );
    }
    editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(paragraph));
      expect(paragraph.getTextContent()).toBe('See the new plan for Q4.');
      const link = paragraph.getChildren()[1];
      assert($isLinkNode(link));
      expect(link.getTextContent()).toBe('the new plan');
    });
  });

  test('Showing blocks to a model: $setBlockText is the same in the docs and the tests', () => {
    const between = (path: string) => {
      const source = fs
        .readFileSync(new URL(path, import.meta.url), 'utf8')
        .replace('export function $setBlockText', 'function $setBlockText');
      const start = source.indexOf("// Changes a block's text in place");
      const holds = source.indexOf('function $holdsOnlyText', start);
      return source.slice(start, source.indexOf('\n}\n', holds) + 2);
    };
    const docs = between(
      '../../../../lexical-website/docs/extensions/block-ids.md',
    );
    expect(docs).toContain('function $holdsOnlyText');
    expect(between('../utils/setBlockText.ts')).toBe(docs);
    expect(
      between('../../../../lexical-y/src/__tests__/unit/BlockHandles.test.ts'),
    ).toBe(docs);
  });

  test('Showing blocks to a model: $setBlockText edits only what differs', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: null,
      dependencies: [RichTextExtension, BlockIdExtension],
      name: 'set-block-text',
    });
    const cases: [string[], string, string[]][] = [
      // [text nodes before, new text, text nodes after]
      [['Revenue grew 4%.'], 'Revenue grew 6%.', ['Revenue grew 6%.']],
      [
        ['Revenue ', 'grew', ' 4%.'],
        'Revenue fell 4%.',
        ['Revenue ', 'fell', ' 4%.'],
      ],
      [['Revenue ', 'grew', ' 4%.'], 'Revenue 4%.', ['Revenue 4%.']],
      [['ab', 'cd', 'ef'], 'aXf', ['aXf']],
      [['ab', 'cd'], 'abXcd', ['abX', 'cd']],
      [['ab', 'cd'], 'abd', ['ab', 'd']],
      [['abc'], 'abc', ['abc']],
      [['abc'], '', []],
      [['abc'], 'abcdef', ['abcdef']],
      [['abc'], 'Xabc', ['Xabc']],
      [[], 'new', ['new']],
    ];
    for (const [before, next, after] of cases) {
      editor.update(
        () => {
          const block = $createParagraphNode();
          for (const [i, text] of before.entries()) {
            // Alternate formats, so that Lexical keeps the nodes apart.
            block.append($createTextNode(text).setFormat(i % 2 ? 'bold' : 0));
          }
          $getRoot().clear().append(block);
        },
        {discrete: true},
      );
      const key = editor.read(() => $getRoot().getFirstChildOrThrow().getKey());
      editor.update(
        () => {
          $setBlockText($getRoot().getFirstChildOrThrow(), next);
        },
        {discrete: true},
      );
      editor.read(() => {
        const block = $getRoot().getFirstChildOrThrow();
        assert($isElementNode(block));
        expect(block.getKey(), JSON.stringify(before)).toBe(key);
        expect(
          block.getAllTextNodes().map(node => node.getTextContent()),
          `${JSON.stringify(before)} → ${next}`,
        ).toEqual(after);
      });
    }
  });

  test('Handles and collaboration: a handle a deleted block prefixed', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        for (const id of ['b123', 'b123456']) {
          const node = $createParagraphNode().append($createTextNode(id));
          $setState(node, blockIdState, id);
          $getRoot().append(node);
        }
      },
      dependencies: [RichTextExtension, BlockIdExtension],
      name: 'my-editor',
    });
    const shown = editor.read(() => $getBlockHandles());
    editor.update(
      () => {
        $getBlockById('b123')!.remove();
      },
      {discrete: true},
    );
    editor.read(() => {
      // Without the read, b123 deleted and b123456 kept: b123 takes it.
      const now = $resolveBlockHandle('b123');
      assert(now.status === 'found');
      expect($getBlockId(now.node)).toBe('b123456');
      // With it, the block the model read is gone.
      expect($resolveBlockHandle('b123', {read: shown}).status).toBe(
        'not-found',
      );
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
