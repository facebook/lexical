/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $caretRangeFromSelection,
  $comparePointCaretNext,
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getCaretInDirection,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isTextNode,
  $selectAll,
  $setSelection,
  createEditor,
  ElementNode,
  LexicalEditor,
  type LexicalNode,
  ParagraphNode,
  RangeSelection,
  TextNode,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

import {SerializedElementNode} from '../..';
import {getShadowRootOrDocument, isShadowRoot} from '../../LexicalUtils';
import {
  $assertRangeSelection,
  $createTestDecoratorNode,
  $createTestInlineElementNode,
  initializeUnitTest,
  invariant,
} from '../utils';

function mapLatest<T extends LexicalNode>(nodes: T[]): T[] {
  return nodes.map((node) => node.getLatest());
}

describe('LexicalSelection tests', () => {
  initializeUnitTest((testEnv) => {
    describe('Inserting text either side of inline elements', () => {
      const setup = async (
        mode: 'start-of-paragraph' | 'mid-paragraph' | 'end-of-paragraph',
      ) => {
        const {container, editor} = testEnv;

        if (!container) {
          throw new Error('Expected container to be truthy');
        }

        await testEnv.editor.update(() => {
          const root = $getRoot();
          if (root.getFirstChild() !== null) {
            throw new Error('Expected root to be childless');
          }

          const paragraph = $createParagraphNode();
          if (mode === 'start-of-paragraph') {
            paragraph.append(
              $createLinkNode('https://', {}).append($createTextNode('a')),
              $createTextNode('b'),
            );
          } else if (mode === 'mid-paragraph') {
            paragraph.append(
              $createTextNode('a'),
              $createLinkNode('https://', {}).append($createTextNode('b')),
              $createTextNode('c'),
            );
          } else {
            paragraph.append(
              $createTextNode('a'),
              $createLinkNode('https://', {}).append($createTextNode('b')),
            );
          }

          root.append(paragraph);
        });

        const expectation =
          mode === 'start-of-paragraph'
            ? '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><a href="https://"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">b</span></p></div>'
            : mode === 'mid-paragraph'
              ? '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">a</span><a href="https://"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">c</span></p></div>'
              : '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">a</span><a href="https://"><span data-lexical-text="true">b</span></a></p></div>';

        expect(container.innerHTML).toBe(expectation);

        return {container, editor};
      };

      const $insertTextOrNodes = (
        selection: RangeSelection,
        method: 'insertText' | 'insertNodes',
      ) => {
        if (method === 'insertText') {
          // Insert text (mirroring what LexicalClipboard does when pasting
          // inline plain text)
          selection.insertText('x');
        } else {
          // Insert a paragraph bearing a single text node (mirroring what
          // LexicalClipboard does when pasting inline rich text)
          selection.insertNodes([
            $createParagraphNode().append($createTextNode('x')),
          ]);
        }
      };

      describe('Inserting text before inline elements', () => {
        describe('Start-of-paragraph inline elements', () => {
          const insertText = async ({
            container,
            editor,
            method,
          }: {
            container: HTMLDivElement;
            editor: LexicalEditor;
            method: 'insertText' | 'insertNodes';
          }) => {
            await testEnv.editor.update(() => {
              const paragraph = $getRoot().getFirstChildOrThrow();
              invariant($isParagraphNode(paragraph));
              const linkNode = paragraph.getFirstChildOrThrow();
              invariant($isLinkNode(linkNode));

              // Place the cursor at the start of the link node
              // For review: is there a way to select "outside" of the link
              // node?
              const selection = linkNode.select(0, 0);
              $insertTextOrNodes(selection, method);
            });

            expect(container.innerHTML).toBe(
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">x</span><a href="https://"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">b</span></p></div>',
            );
          };

          test('Can insert text before a start-of-paragraph inline element, using insertText', async () => {
            const {container, editor} = await setup('start-of-paragraph');

            await insertText({container, editor, method: 'insertText'});
          });

          // TODO: https://github.com/facebook/lexical/issues/4295
          // test('Can insert text before a start-of-paragraph inline element, using insertNodes', async () => {
          //   const {container, editor} = await setup('start-of-paragraph');

          //   await insertText({container, editor, method: 'insertNodes'});
          // });
        });

        describe('Mid-paragraph inline elements', () => {
          const insertText = async ({
            container,
            editor,
            method,
          }: {
            container: HTMLDivElement;
            editor: LexicalEditor;
            method: 'insertText' | 'insertNodes';
          }) => {
            await testEnv.editor.update(() => {
              const paragraph = $getRoot().getFirstChildOrThrow();
              invariant($isParagraphNode(paragraph));
              const textNode = paragraph.getFirstChildOrThrow();
              invariant($isTextNode(textNode));

              // Place the cursor between the link and the first text node by
              // selecting the end of the text node
              const selection = textNode.select(1, 1);
              $insertTextOrNodes(selection, method);
            });

            expect(container.innerHTML).toBe(
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">ax</span><a href="https://"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">c</span></p></div>',
            );
          };

          test('Can insert text before a mid-paragraph inline element, using insertText', async () => {
            const {container, editor} = await setup('mid-paragraph');

            await insertText({container, editor, method: 'insertText'});
          });

          test('Can insert text before a mid-paragraph inline element, using insertNodes', async () => {
            const {container, editor} = await setup('mid-paragraph');

            await insertText({container, editor, method: 'insertNodes'});
          });
        });

        describe('End-of-paragraph inline elements', () => {
          const insertText = async ({
            container,
            editor,
            method,
          }: {
            container: HTMLDivElement;
            editor: LexicalEditor;
            method: 'insertText' | 'insertNodes';
          }) => {
            await testEnv.editor.update(() => {
              const paragraph = $getRoot().getFirstChildOrThrow();
              invariant($isParagraphNode(paragraph));
              const textNode = paragraph.getFirstChildOrThrow();
              invariant($isTextNode(textNode));

              // Place the cursor before the link element by selecting the end
              // of the text node
              const selection = textNode.select(1, 1);
              $insertTextOrNodes(selection, method);
            });

            expect(container.innerHTML).toBe(
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">ax</span><a href="https://"><span data-lexical-text="true">b</span></a></p></div>',
            );
          };

          test('Can insert text before an end-of-paragraph inline element, using insertText', async () => {
            const {container, editor} = await setup('end-of-paragraph');

            await insertText({container, editor, method: 'insertText'});
          });

          test('Can insert text before an end-of-paragraph inline element, using insertNodes', async () => {
            const {container, editor} = await setup('end-of-paragraph');

            await insertText({container, editor, method: 'insertNodes'});
          });
        });
      });

      describe('Inserting text after inline elements', () => {
        describe('Start-of-paragraph inline elements', () => {
          const insertText = async ({
            container,
            editor,
            method,
          }: {
            container: HTMLDivElement;
            editor: LexicalEditor;
            method: 'insertText' | 'insertNodes';
          }) => {
            await testEnv.editor.update(() => {
              const paragraph = $getRoot().getFirstChildOrThrow();
              invariant($isParagraphNode(paragraph));
              const textNode = paragraph.getLastChildOrThrow();
              invariant($isTextNode(textNode));

              // Place the cursor between the link and the last text node by
              // selecting the start of the text node
              const selection = textNode.select(0, 0);
              $insertTextOrNodes(selection, method);
            });

            expect(container.innerHTML).toBe(
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><a href="https://"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">xb</span></p></div>',
            );
          };

          test('Can insert text after a start-of-paragraph inline element, using insertText', async () => {
            const {container, editor} = await setup('start-of-paragraph');

            await insertText({container, editor, method: 'insertText'});
          });

          // TODO: https://github.com/facebook/lexical/issues/4295
          // test('Can insert text after a start-of-paragraph inline element, using insertNodes', async () => {
          //   const {container, editor} = await setup('start-of-paragraph');

          //   await insertText({container, editor, method: 'insertNodes'});
          // });
        });

        describe('Mid-paragraph inline elements', () => {
          const insertText = async ({
            container,
            editor,
            method,
          }: {
            container: HTMLDivElement;
            editor: LexicalEditor;
            method: 'insertText' | 'insertNodes';
          }) => {
            await testEnv.editor.update(() => {
              const paragraph = $getRoot().getFirstChildOrThrow();
              invariant($isParagraphNode(paragraph));
              const textNode = paragraph.getLastChildOrThrow();
              invariant($isTextNode(textNode));

              // Place the cursor between the link and the last text node by
              // selecting the start of the text node
              const selection = textNode.select(0, 0);
              $insertTextOrNodes(selection, method);
            });

            expect(container.innerHTML).toBe(
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">a</span><a href="https://"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">xc</span></p></div>',
            );
          };

          test('Can insert text after a mid-paragraph inline element, using insertText', async () => {
            const {container, editor} = await setup('mid-paragraph');

            await insertText({container, editor, method: 'insertText'});
          });

          // TODO: https://github.com/facebook/lexical/issues/4295
          // test('Can insert text after a mid-paragraph inline element, using insertNodes', async () => {
          //   const {container, editor} = await setup('mid-paragraph');

          //   await insertText({container, editor, method: 'insertNodes'});
          // });
        });

        describe('End-of-paragraph inline elements', () => {
          const insertText = async ({
            container,
            editor,
            method,
          }: {
            container: HTMLDivElement;
            editor: LexicalEditor;
            method: 'insertText' | 'insertNodes';
          }) => {
            await testEnv.editor.update(() => {
              const paragraph = $getRoot().getFirstChildOrThrow();
              invariant($isParagraphNode(paragraph));
              const linkNode = paragraph.getLastChildOrThrow();
              invariant($isLinkNode(linkNode));

              // Place the cursor at the end of the link element
              // For review: not sure if there's a better way to select
              // "outside" of the link element.
              const selection = linkNode.select(1, 1);
              $insertTextOrNodes(selection, method);
            });

            expect(container.innerHTML).toBe(
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">a</span><a href="https://"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">x</span></p></div>',
            );
          };

          test('Can insert text after an end-of-paragraph inline element, using insertText', async () => {
            const {container, editor} = await setup('end-of-paragraph');

            await insertText({container, editor, method: 'insertText'});
          });

          // TODO: https://github.com/facebook/lexical/issues/4295
          // test('Can insert text after an end-of-paragraph inline element, using insertNodes', async () => {
          //   const {container, editor} = await setup('end-of-paragraph');

          //   await insertText({container, editor, method: 'insertNodes'});
          // });
        });
      });
    });

    describe('insertText()', () => {
      test('inserts into existing paragraph node when selection is on parent of paragraph', () => {
        const {editor} = testEnv;
        editor.update(() => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.clear().append(paragraph);

          const selection = $createRangeSelection();
          selection.anchor.set('root', 0, 'element');
          selection.focus.set('root', 0, 'element');
          $setSelection(selection);

          selection.insertText('text');
          expect(root.getChildrenSize()).toBe(1);
          expect(root.getTextContent()).toBe('text');
        });
      });
    });

    describe('removeText', () => {
      describe('with a leading TextNode and a trailing token TextNode', () => {
        let leadingText: TextNode;
        let trailingTokenText: TextNode;
        let paragraph: ParagraphNode;
        beforeEach(() => {
          testEnv.editor.update(
            () => {
              leadingText = $createTextNode('leading text');
              trailingTokenText =
                $createTextNode('token text').setMode('token');
              paragraph = $createParagraphNode().append(
                leadingText,
                trailingTokenText,
              );
              $getRoot().clear().append(paragraph);
            },
            {discrete: true},
          );
        });
        test('remove all text', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 0, 'text');
              sel.focus.set(
                trailingTokenText.getKey(),
                trailingTokenText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(false);
              expect(trailingTokenText.isAttached()).toBe(false);
              expect($getRoot().getAllTextNodes()).toHaveLength(0);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(paragraph.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove initial TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 0, 'text');
              sel.focus.set(
                leadingText.getKey(),
                leadingText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(false);
              expect(trailingTokenText.isAttached()).toBe(true);
              expect($getRoot().getAllTextNodes()).toHaveLength(1);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(trailingTokenText.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove trailing token TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(trailingTokenText.getKey(), 0, 'text');
              sel.focus.set(
                trailingTokenText.getKey(),
                trailingTokenText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(true);
              expect(trailingTokenText.isAttached()).toBe(false);
              expect($getRoot().getAllTextNodes()).toHaveLength(1);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(leadingText.getKey());
              expect(selection.anchor.offset).toBe(
                leadingText.getTextContentSize(),
              );
            },
            {discrete: true},
          );
        });
        test('remove initial TextNode and partial token TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 0, 'text');
              sel.focus.set(
                trailingTokenText.getKey(),
                'token '.length,
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(false);
              // expecting no node since it was token
              expect(trailingTokenText.isAttached()).toBe(false);
              const allTextNodes = $getRoot().getAllTextNodes();
              expect(allTextNodes).toHaveLength(0);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(paragraph.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove partial initial TextNode and partial token TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 'lead'.length, 'text');
              sel.focus.set(
                trailingTokenText.getKey(),
                'token '.length,
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(true);
              expect(trailingTokenText.isAttached()).toBe(false);
              const allTextNodes = $getRoot().getAllTextNodes();
              // The token node will be completely removed
              expect(allTextNodes.map((node) => node.getTextContent())).toEqual(
                ['lead'],
              );
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(leadingText.getKey());
              expect(selection.anchor.offset).toBe('lead'.length);
            },
            {discrete: true},
          );
        });
      });
      describe('with a leading token TextNode and a trailing TextNode', () => {
        let leadingTokenText: TextNode;
        let trailingText: TextNode;
        let paragraph: ParagraphNode;
        beforeEach(() => {
          testEnv.editor.update(
            () => {
              leadingTokenText = $createTextNode('token text').setMode('token');
              trailingText = $createTextNode('trailing text');
              paragraph = $createParagraphNode().append(
                leadingTokenText,
                trailingText,
              );
              $getRoot().clear().append(paragraph);
            },
            {discrete: true},
          );
        });
        test('remove all text', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingTokenText.getKey(), 0, 'text');
              sel.focus.set(
                trailingText.getKey(),
                trailingText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingTokenText.isAttached()).toBe(false);
              expect(trailingText.isAttached()).toBe(false);
              expect($getRoot().getAllTextNodes()).toHaveLength(0);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(paragraph.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove trailing TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(trailingText.getKey(), 0, 'text');
              sel.focus.set(
                trailingText.getKey(),
                trailingText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingTokenText.isAttached()).toBe(true);
              expect(trailingText.isAttached()).toBe(false);
              expect($getRoot().getAllTextNodes()).toHaveLength(1);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(leadingTokenText.getKey());
              expect(selection.anchor.offset).toBe(
                leadingTokenText.getTextContentSize(),
              );
            },
            {discrete: true},
          );
        });
        test('remove leading token TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingTokenText.getKey(), 0, 'text');
              sel.focus.set(
                leadingTokenText.getKey(),
                leadingTokenText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingTokenText.isAttached()).toBe(false);
              expect(trailingText.isAttached()).toBe(true);
              expect($getRoot().getAllTextNodes()).toHaveLength(1);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(trailingText.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove partial leading token TextNode and trailing TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(
                leadingTokenText.getKey(),
                'token '.length,
                'text',
              );
              sel.focus.set(
                trailingText.getKey(),
                trailingText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(trailingText.isAttached()).toBe(false);
              // expecting no node since it was token
              expect(leadingTokenText.isAttached()).toBe(false);
              const allTextNodes = $getRoot().getAllTextNodes();
              expect(allTextNodes).toHaveLength(0);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(paragraph.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove partial token TextNode and partial trailing TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(
                leadingTokenText.getKey(),
                'token '.length,
                'text',
              );
              sel.focus.set(trailingText.getKey(), 'trail'.length, 'text');
              $setSelection(sel);
              sel.removeText();
              expect(leadingTokenText.isAttached()).toBe(false);
              expect(trailingText.isAttached()).toBe(true);
              const allTextNodes = $getRoot().getAllTextNodes();
              // The token node will be completely removed
              expect(allTextNodes.map((node) => node.getTextContent())).toEqual(
                ['ing text'],
              );
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(trailingText.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
      });
      describe('with a leading TextNode and a trailing segmented TextNode', () => {
        let leadingText: TextNode;
        let trailingSegmentedText: TextNode;
        let paragraph: ParagraphNode;
        beforeEach(() => {
          testEnv.editor.update(
            () => {
              leadingText = $createTextNode('leading text');
              trailingSegmentedText =
                $createTextNode('segmented text').setMode('segmented');
              paragraph = $createParagraphNode().append(
                leadingText,
                trailingSegmentedText,
              );
              $getRoot().clear().append(paragraph);
            },
            {discrete: true},
          );
        });
        test('remove all text', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 0, 'text');
              sel.focus.set(
                trailingSegmentedText.getKey(),
                trailingSegmentedText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(false);
              expect(trailingSegmentedText.isAttached()).toBe(false);
              expect($getRoot().getAllTextNodes()).toHaveLength(0);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(paragraph.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove initial TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 0, 'text');
              sel.focus.set(
                leadingText.getKey(),
                leadingText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(false);
              expect(trailingSegmentedText.isAttached()).toBe(true);
              expect($getRoot().getAllTextNodes()).toHaveLength(1);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(trailingSegmentedText.getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove trailing segmented TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(trailingSegmentedText.getKey(), 0, 'text');
              sel.focus.set(
                trailingSegmentedText.getKey(),
                trailingSegmentedText.getTextContentSize(),
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(true);
              expect(trailingSegmentedText.isAttached()).toBe(false);
              expect($getRoot().getAllTextNodes()).toHaveLength(1);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(leadingText.getKey());
              expect(selection.anchor.offset).toBe(
                leadingText.getTextContentSize(),
              );
            },
            {discrete: true},
          );
        });
        test('remove initial TextNode and partial segmented TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 0, 'text');
              sel.focus.set(
                trailingSegmentedText.getKey(),
                'segmented '.length,
                'text',
              );
              $setSelection(sel);
              sel.removeText();
              expect(leadingText.isAttached()).toBe(false);
              // expecting a new node since it was segmented
              expect(trailingSegmentedText.isAttached()).toBe(false);
              const allTextNodes = $getRoot().getAllTextNodes();
              expect(allTextNodes.map((node) => node.getTextContent())).toEqual(
                ['text'],
              );
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(allTextNodes[0].getKey());
              expect(selection.anchor.offset).toBe(0);
            },
            {discrete: true},
          );
        });
        test('remove partial initial TextNode and partial segmented TextNode', () => {
          testEnv.editor.update(
            () => {
              const sel = $createRangeSelection();
              sel.anchor.set(leadingText.getKey(), 'lead'.length, 'text');
              sel.focus.set(
                trailingSegmentedText.getKey(),
                'segmented '.length,
                'text',
              );
              $setSelection(sel);
              expect($getSelection()).toBe(sel);
              sel.removeText();
              expect($getSelection()).toBe(sel);
              expect(leadingText.isAttached()).toBe(true);
              expect(trailingSegmentedText.isAttached()).toBe(false);
              const allTextNodes = $getRoot().getAllTextNodes();
              // These should get merged in reconciliation
              expect(allTextNodes.map((node) => node.getTextContent())).toEqual(
                ['lead', 'text'],
              );
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(leadingText.getKey());
              expect(selection.anchor.offset).toBe('lead'.length);
            },
            {discrete: true},
          );
          testEnv.editor.getEditorState().read(() => {
            const allTextNodes = $getRoot().getAllTextNodes();
            // These should get merged in reconciliation
            expect(allTextNodes.map((node) => node.getTextContent())).toEqual([
              'leadtext',
            ]);
            expect(leadingText.isAttached()).toBe(true);
          });
        });
      });
    });
  });
});

describe('Regression tests for #6701', () => {
  test('insertNodes fails an invariant when there is no Block ancestor', async () => {
    class InlineElementNode extends ElementNode {
      static clone(prevNode: InlineElementNode): InlineElementNode {
        return new InlineElementNode(prevNode.__key);
      }
      static getType() {
        return 'inline-element-node';
      }
      static importJSON(serializedNode: SerializedElementNode) {
        return new InlineElementNode().updateFromJSON(serializedNode);
      }
      isInline() {
        return true;
      }
      createDOM() {
        return document.createElement('span');
      }
      updateDOM() {
        return false;
      }
    }
    const editor = createEditor({
      nodes: [InlineElementNode],
      onError: (err) => {
        throw err;
      },
    });
    expect(() =>
      editor.update(
        () => {
          const textNode = $createTextNode('test');
          $getRoot().clear().append(new InlineElementNode().append(textNode));
          textNode.select().insertNodes([$createTextNode('more text')]);
        },
        {discrete: true},
      ),
    ).toThrow(
      /Expected node TextNode of type text to have a block ElementNode ancestor/,
    );
  });
});

describe('getNodes()', () => {
  initializeUnitTest((testEnv) => {
    let paragraphNode: ParagraphNode;
    let paragraphText: TextNode;
    let linkNode: LinkNode;
    let linkText: TextNode;
    let listNode: ListNode;
    let listItemText1: TextNode;
    let listItemText2: TextNode;
    let listItem1: ListItemNode;
    let listItem2: ListItemNode;
    let emptyParagraph: ParagraphNode;

    beforeEach(() => {
      testEnv.editor.update(() => {
        paragraphText = $createTextNode('paragraph text');
        linkText = $createTextNode('link text');
        linkNode = $createLinkNode();
        paragraphNode = $createParagraphNode();
        listItemText1 = $createTextNode('item 1');
        listItemText2 = $createTextNode('item 2');
        listItem1 = $createListItemNode();
        listItem2 = $createListItemNode();
        listNode = $createListNode('bullet');
        emptyParagraph = $createParagraphNode();
        $getRoot()
          .clear()
          .append(
            paragraphNode.append(paragraphText, linkNode.append(linkText)),
            listNode.append(
              listItem1.append(listItemText1),
              listItem2.append(listItemText2),
            ),
            emptyParagraph,
          );
      });
    });
    describe('$selectAll()', () => {
      test('with test document', () => {
        testEnv.editor.update(
          () => {
            const selection = $selectAll();
            // Normalized to the text nodes
            expect(selection).toMatchObject({
              anchor: {key: paragraphText.getKey(), offset: 0, type: 'text'},
              focus: {key: emptyParagraph.getKey(), offset: 0, type: 'element'},
            });
            expect(selection.getNodes()).toEqual([
              paragraphText,
              linkNode,
              linkText,
              // The parent paragraphNode comes after its children because the
              // selection started inside of it at paragraphText
              paragraphNode,
              listNode,
              listItem1,
              listItemText1,
              listItem2,
              listItemText2,
              emptyParagraph,
            ]);
          },
          {discrete: true},
        );
      });
      test('with leading inline decorator', () => {
        testEnv.editor.update(
          () => {
            const inlineDecoratorLeading = $createTestDecoratorNode();
            paragraphNode.splice(0, 0, [inlineDecoratorLeading]);
            const selection = $selectAll();
            // Normalized to the text nodes
            expect(selection).toMatchObject({
              anchor: {key: paragraphNode.getKey(), offset: 0, type: 'element'},
              focus: {key: emptyParagraph.getKey(), offset: 0, type: 'element'},
            });
            expect(selection.getNodes()).toEqual(
              [
                inlineDecoratorLeading,
                paragraphText,
                linkNode,
                linkText,
                // The parent paragraphNode comes after its children because the
                // selection started inside of it at paragraphText
                paragraphNode,
                listNode,
                listItem1,
                listItemText1,
                listItem2,
                listItemText2,
                emptyParagraph,
              ].map((node) => node.getLatest()),
            );
          },
          {discrete: true},
        );
      });
      test('with trailing inline decorator', () => {
        testEnv.editor.update(
          () => {
            const inlineDecoratorTrailing = $createTestDecoratorNode();
            const noLongerEmptyParagraph = emptyParagraph;
            noLongerEmptyParagraph.splice(0, 0, [inlineDecoratorTrailing]);
            const selection = $selectAll();
            // Normalized to the text nodes
            expect(selection).toMatchObject({
              anchor: {key: paragraphText.getKey(), offset: 0, type: 'text'},
              focus: {key: emptyParagraph.getKey(), offset: 1, type: 'element'},
            });
            expect(selection.getNodes()).toEqual(
              [
                paragraphText,
                linkNode,
                linkText,
                // The parent paragraphNode comes after its children because the
                // selection started inside of it at paragraphText
                paragraphNode,
                listNode,
                listItem1,
                listItemText1,
                listItem2,
                listItemText2,
                noLongerEmptyParagraph,
                inlineDecoratorTrailing,
              ].map((node) => node.getLatest()),
            );
          },
          {discrete: true},
        );
      });
      test('with leading empty inline element', () => {
        testEnv.editor.update(
          () => {
            const inlineElementLeading = $createTestInlineElementNode();
            paragraphNode.splice(0, 0, [inlineElementLeading]);
            const selection = $selectAll();
            // Normalized to the text nodes
            expect(selection).toMatchObject({
              anchor: {
                key: inlineElementLeading.getKey(),
                offset: 0,
                type: 'element',
              },
              focus: {key: emptyParagraph.getKey(), offset: 0, type: 'element'},
            });
            expect(selection.getNodes()).toEqual(
              [
                inlineElementLeading,
                paragraphText,
                linkNode,
                linkText,
                // The parent paragraphNode comes after its children because the
                // selection started inside of it at paragraphText
                paragraphNode,
                listNode,
                listItem1,
                listItemText1,
                listItem2,
                listItemText2,
                emptyParagraph,
              ].map((node) => node.getLatest()),
            );
          },
          {discrete: true},
        );
      });
      test('with trailing empty inline element', () => {
        testEnv.editor.update(
          () => {
            const inlineElementTrailing = $createTestInlineElementNode();
            const noLongerEmptyParagraph = emptyParagraph;
            noLongerEmptyParagraph.splice(0, 0, [inlineElementTrailing]);
            const selection = $selectAll();
            // Normalized to the text nodes
            expect(selection).toMatchObject({
              anchor: {key: paragraphText.getKey(), offset: 0, type: 'text'},
              focus: {
                key: inlineElementTrailing.getKey(),
                offset: 0,
                type: 'element',
              },
            });
            expect(selection.getNodes()).toEqual(
              [
                paragraphText,
                linkNode,
                linkText,
                // The parent paragraphNode comes after its children because the
                // selection started inside of it at paragraphText
                paragraphNode,
                listNode,
                listItem1,
                listItemText1,
                listItem2,
                listItemText2,
                noLongerEmptyParagraph,
                inlineElementTrailing,
              ].map((node) => node.getLatest()),
            );
          },
          {discrete: true},
        );
      });
      test('after removing empty paragraph', () => {
        testEnv.editor.update(
          () => {
            emptyParagraph.remove();
            const selection = $selectAll();
            // Normalized to the text nodes
            expect(selection).toMatchObject({
              anchor: {key: paragraphText.getKey(), offset: 0, type: 'text'},
              focus: {
                key: listItemText2.getKey(),
                offset: listItemText2.getTextContentSize(),
                type: 'text',
              },
            });
            expect(selection.getNodes()).toEqual(
              [
                paragraphText,
                linkNode,
                linkText,
                // The parent paragraphNode comes after its children because the
                // selection started inside of it at paragraphText
                paragraphNode,
                listNode,
                listItem1,
                listItemText1,
                listItem2,
                listItemText2,
              ].map((n) => n.getLatest()),
            );
          },
          {discrete: true},
        );
      });
    });
    test('Manual select all without normalization', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set('root', 0, 'element');
          selection.focus.set('root', $getRoot().getChildrenSize(), 'element');
          expect(selection.getNodes()).toEqual([
            paragraphText,
            linkNode,
            linkText,
            // The parent paragraphNode comes later because there is
            // an implicit normalization in the beginning of getNodes
            // to work around… something? See the getDescendantByIndex usage.
            paragraphNode,
            listNode,
            listItem1,
            listItemText1,
            listItem2,
            listItemText2,
            emptyParagraph,
          ]);
        },
        {discrete: true},
      );
    });
    test('Manual select all from first text to last empty paragraph', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphText.getKey(), 0, 'text');
          selection.focus.set(emptyParagraph.getKey(), 0, 'element');
          expect(selection.getNodes()).toEqual([
            paragraphText,
            linkNode,
            linkText,
            // The parent paragraphNode comes later because there is
            // an implicit normalization in the beginning of getNodes
            // to work around… something? See the getDescendantByIndex usage.
            paragraphNode,
            listNode,
            listItem1,
            listItemText1,
            listItem2,
            listItemText2,
            emptyParagraph,
          ]);
        },
        {discrete: true},
      );
    });
    test('Manual select with focus collapsed between inline decorators', () => {
      testEnv.editor.update(
        () => {
          const inlineDecoratorLeading = $createTestDecoratorNode();
          const inlineDecoratorTrailing = $createTestDecoratorNode();
          const noLongerEmptyParagraph = emptyParagraph;
          noLongerEmptyParagraph.splice(0, 0, [
            inlineDecoratorLeading,
            inlineDecoratorTrailing,
          ]);
          const selection = $createRangeSelection();
          // Collapsed between decorators
          selection.anchor.set(noLongerEmptyParagraph.getKey(), 1, 'element');
          selection.focus.set(noLongerEmptyParagraph.getKey(), 1, 'element');
          expect(selection.isCollapsed()).toBe(true);
          expect(selection).toMatchObject({
            anchor: {
              key: noLongerEmptyParagraph.getKey(),
              offset: 1,
              type: 'element',
            },
            focus: {
              key: noLongerEmptyParagraph.getKey(),
              offset: 1,
              type: 'element',
            },
          });
          expect(selection.getNodes()).toEqual(
            // The bias is towards the right
            [inlineDecoratorTrailing].map((node) => node.getLatest()),
          );
        },
        {discrete: true},
      );
    });
    test('Manual select with focus collapsed after inline decorator', () => {
      testEnv.editor.update(
        () => {
          const inlineDecoratorLeading = $createTestDecoratorNode();
          const inlineDecoratorTrailing = $createTestDecoratorNode();
          const noLongerEmptyParagraph = emptyParagraph;
          noLongerEmptyParagraph.splice(0, 0, [
            inlineDecoratorLeading,
            inlineDecoratorTrailing,
          ]);
          const selection = $createRangeSelection();
          // Collapsed after decorators
          selection.anchor.set(noLongerEmptyParagraph.getKey(), 2, 'element');
          selection.focus.set(noLongerEmptyParagraph.getKey(), 2, 'element');
          expect(selection.isCollapsed()).toBe(true);
          expect(selection).toMatchObject({
            anchor: {
              key: noLongerEmptyParagraph.getKey(),
              offset: 2,
              type: 'element',
            },
            focus: {
              key: noLongerEmptyParagraph.getKey(),
              offset: 2,
              type: 'element',
            },
          });
          expect(selection.getNodes()).toEqual(
            // The bias is towards the last descendant since no
            // nodes exist to the right
            [inlineDecoratorTrailing].map((node) => node.getLatest()),
          );
        },
        {discrete: true},
      );
    });
    test('Manual select with focus between inline decorators', () => {
      testEnv.editor.update(
        () => {
          const inlineDecoratorLeading = $createTestDecoratorNode();
          const inlineDecoratorTrailing = $createTestDecoratorNode();
          const noLongerEmptyParagraph = emptyParagraph;
          noLongerEmptyParagraph.splice(0, 0, [
            inlineDecoratorLeading,
            inlineDecoratorTrailing,
          ]);
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphText.getKey(), 0, 'text');
          selection.focus.set(noLongerEmptyParagraph.getKey(), 1, 'element');
          expect(selection).toMatchObject({
            anchor: {key: paragraphText.getKey(), offset: 0, type: 'text'},
            focus: {
              key: noLongerEmptyParagraph.getKey(),
              offset: 1,
              type: 'element',
            },
          });
          expect(selection.getNodes()).toEqual(
            [
              paragraphText,
              linkNode,
              linkText,
              // The parent paragraphNode comes after its children because the
              // selection started inside of it at paragraphText
              paragraphNode,
              listNode,
              listItem1,
              listItemText1,
              listItem2,
              listItemText2,
              noLongerEmptyParagraph,
              inlineDecoratorLeading,
            ].map((node) => node.getLatest()),
          );
        },
        {discrete: true},
      );
    });
    test('select only the paragraph (not normalized)', () => {
      testEnv.editor.update(
        () => {
          const selection = paragraphNode.select(
            0,
            paragraphNode.getChildrenSize(),
          );
          expect(selection).toMatchObject({
            anchor: {key: paragraphNode.getKey(), offset: 0, type: 'element'},
            focus: {
              key: paragraphNode.getKey(),
              offset: paragraphNode.getChildrenSize(),
              type: 'element',
            },
          });
          // The selection doesn't visit outside of the paragraph
          expect(selection.getNodes()).toEqual([
            paragraphText,
            linkNode,
            linkText,
          ]);
        },
        {discrete: true},
      );
    });
    test('select around the paragraph (not normalized)', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(
            'root',
            paragraphNode.getIndexWithinParent(),
            'element',
          );
          selection.focus.set(
            'root',
            paragraphNode.getIndexWithinParent() + 1,
            'element',
          );
          expect(selection).toMatchObject({
            anchor: {key: 'root', offset: 0, type: 'element'},
            focus: {key: 'root', offset: 1, type: 'element'},
          });
          // The selection shouldn't visit outside of the paragraph
          expect(selection.getNodes()).toEqual([
            paragraphText,
            linkNode,
            linkText,
            paragraphNode,
          ]);
        },
        {discrete: true},
      );
    });
    test('selection collapsed inside an empty element', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(emptyParagraph.getKey(), 0, 'element');
          selection.focus.set(emptyParagraph.getKey(), 0, 'element');
          // The selection should include the node it is collapsed inside
          expect(selection.getNodes()).toEqual([emptyParagraph]);
        },
        {discrete: true},
      );
    });
    test('select an empty ListItemNode (collapsed)', () => {
      testEnv.editor.update(
        () => {
          const emptyListItem = $createListItemNode();
          listItem2.insertBefore(emptyListItem);
          const selection = $createRangeSelection();
          selection.anchor.set(emptyListItem.getKey(), 0, 'element');
          selection.focus.set(emptyListItem.getKey(), 0, 'element');
          expect(selection).toMatchObject({
            anchor: {key: emptyListItem.getKey(), offset: 0, type: 'element'},
            focus: {key: emptyListItem.getKey(), offset: 0, type: 'element'},
          });
          expect(selection.getNodes()).toEqual([emptyListItem]);
        },
        {discrete: true},
      );
    });
  });
});

describe('extract()', () => {
  initializeUnitTest((testEnv) => {
    let paragraphNode: ParagraphNode;
    let paragraphText: TextNode;
    let linkNode: LinkNode;
    let linkText: TextNode;
    let listNode: ListNode;
    let listItemText1: TextNode;
    let listItemText2: TextNode;
    let listItem1: ListItemNode;
    let listItem2: ListItemNode;
    let emptyParagraph: ParagraphNode;

    beforeEach(() => {
      testEnv.editor.update(() => {
        paragraphText = $createTextNode('paragraph text');
        linkText = $createTextNode('link text');
        linkNode = $createLinkNode();
        paragraphNode = $createParagraphNode();
        listItemText1 = $createTextNode('item 1');
        listItemText2 = $createTextNode('item 2');
        listItem1 = $createListItemNode();
        listItem2 = $createListItemNode();
        listNode = $createListNode('bullet');
        emptyParagraph = $createParagraphNode();
        $getRoot()
          .clear()
          .append(
            paragraphNode.append(paragraphText, linkNode.append(linkText)),
            listNode.append(
              listItem1.append(listItemText1),
              listItem2.append(listItemText2),
            ),
            emptyParagraph,
          );
      });
    });
    test('Manual select all without normalization', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set('root', 0, 'element');
          selection.focus.set('root', $getRoot().getChildrenSize(), 'element');
          const extracted = selection.extract();
          expect(extracted).toEqual([
            paragraphText,
            linkNode,
            linkText,
            // The parent paragraphNode comes later because there is
            // an implicit normalization in the beginning of getNodes
            // to work around… something? See the getDescendantByIndex usage.
            paragraphNode,
            listNode,
            listItem1,
            listItemText1,
            listItem2,
            listItemText2,
            emptyParagraph,
          ]);
          expect(selection.getNodes()).toEqual(extracted);
        },
        {discrete: true},
      );
    });
    test('Manual select all from first text to last empty paragraph', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphText.getKey(), 0, 'text');
          selection.focus.set(emptyParagraph.getKey(), 0, 'element');
          const extracted = selection.extract();
          expect(extracted).toEqual([
            paragraphText,
            linkNode,
            linkText,
            // The parent paragraphNode comes later because there is
            // an implicit normalization in the beginning of getNodes
            // to work around… something? See the getDescendantByIndex usage.
            paragraphNode,
            listNode,
            listItem1,
            listItemText1,
            listItem2,
            listItemText2,
            emptyParagraph,
          ]);
          expect(selection.getNodes()).toEqual(extracted);
        },
        {discrete: true},
      );
    });
    test('select partial TextNode extracts paragraph text', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphText.getKey(), 2, 'text');
          selection.focus.set(paragraphText.getKey(), 8, 'text');
          const extracted = selection.extract();
          expect(extracted).toEqual([
            expect.objectContaining({__text: 'ragrap'}),
          ]);
          expect(selection.getNodes()).toEqual(extracted);
        },
        {discrete: true},
      );
    });
    test('select partial TextNode extracts link text', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(linkText.getKey(), 1, 'text');
          selection.focus.set(linkText.getKey(), 4, 'text');
          const extracted = selection.extract();
          expect(extracted).toEqual([expect.objectContaining({__text: 'ink'})]);
          expect(selection.getNodes()).toEqual(extracted);
        },
        {discrete: true},
      );
    });
    test('select multiple partial TextNode extracts text', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphText.getKey(), 10, 'text');
          selection.focus.set(linkText.getKey(), 4, 'text');
          const extracted = selection.extract();
          expect(mapLatest(extracted)).toEqual([
            expect.objectContaining({__text: 'text'}),
            linkNode.getLatest(),
            expect.objectContaining({__text: 'link'}),
          ]);
          expect(mapLatest(selection.getNodes())).toEqual(mapLatest(extracted));
        },
        {discrete: true},
      );
    });
    test('select last offset TextNode as first node removes node', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(
            paragraphText.getKey(),
            paragraphText.getTextContentSize(),
            'text',
          );
          selection.focus.set(linkText.getKey(), 4, 'text');
          const beforeNodes = selection.getNodes();
          const extracted = selection.extract();
          expect(mapLatest(extracted)).toEqual([
            linkNode.getLatest(),
            expect.objectContaining({__text: 'link'}),
          ]);
          // The identity of the linkText does not change
          // since the first node is re-used
          expect(mapLatest(selection.getNodes())).toEqual(
            mapLatest(beforeNodes),
          );
        },
        {discrete: true},
      );
    });
    test('select 0 offset TextNode as last node removes node', () => {
      testEnv.editor.update(
        () => {
          const selection = $createRangeSelection();
          selection.anchor.set(paragraphText.getKey(), 4, 'text');
          selection.focus.set(linkText.getKey(), 0, 'text');
          const beforeNodes = selection.getNodes();
          expect(mapLatest(selection.extract())).toEqual([
            expect.objectContaining({__text: 'graph text'}),
            linkNode.getLatest(),
          ]);
          // The identity is not paragraphText anymore because
          // that is the left side outside of the extraction
          expect(mapLatest(selection.getNodes())).toEqual([
            paragraphText.getNextSibling(),
            ...mapLatest(beforeNodes.slice(1)),
          ]);
        },
        {discrete: true},
      );
    });
  });
});

describe('Regression #7081', () => {
  initializeUnitTest((testEnv) => {
    test('Firefox selection & paste before linebreak', () => {
      testEnv.editor.update(
        () => {
          const textNode =
            $createTextNode('XXXX').setStyle(`color: --color-test`);
          const paragraphNode = $createParagraphNode();
          $getRoot()
            .clear()
            .append(
              paragraphNode.append(
                $createTextNode('ID: '),
                textNode,
                $createLineBreakNode(),
                $createTextNode('aa'),
              ),
            );
          const selection = textNode.select(0);
          selection.focus.set(
            paragraphNode.getKey(),
            1 + textNode.getIndexWithinParent(),
            'element',
          );
          selection.insertText('123');
          expect(textNode.isAttached()).toBe(true);
          expect(textNode.getTextContent()).toBe('123');
        },
        {discrete: true},
      );
    });
  });
});

describe('Regression #7173', () => {
  initializeUnitTest((testEnv) => {
    test('Can insertNodes of multiple blocks with a target of an initial empty block and the entire next block', () => {
      testEnv.editor.update(
        () => {
          const emptyParagraph = $createParagraphNode();
          const replacedParagraph = $createParagraphNode().append(
            $createTextNode('replaced!'),
          );
          $getRoot().clear().append(emptyParagraph, replacedParagraph);
          const selection = $selectAll();
          const insertedNodes = [
            $createParagraphNode().append($createTextNode('p1')),
            $createParagraphNode().append($createTextNode('p2')),
          ];
          selection.insertNodes(insertedNodes);
          const children = $getRoot().getChildren();
          expect(children).toHaveLength(2);
          expect(children).toEqual(insertedNodes);
        },
        {discrete: true},
      );
    });
  });
});

describe('Regression #3181', () => {
  initializeUnitTest((testEnv) => {
    test('Point.isBefore edge case with mixed TextNode & ElementNode and matching descendants', () => {
      testEnv.editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const targetText = $createTextNode('target').setMode('token');
          $getRoot()
            .clear()
            .append(
              paragraph.append(
                $createTextNode('a').setMode('token'),
                $createTextNode('b').setMode('token'),
                targetText,
              ),
            );
          const selection = paragraph.select(2, 2);
          selection.focus.set(targetText.getKey(), 1, 'text');
          expect(selection).toMatchObject({
            anchor: {key: paragraph.getKey(), offset: 2, type: 'element'},
            focus: {key: targetText.getKey(), offset: 1, type: 'text'},
          });
          const caretRange = $caretRangeFromSelection(selection);
          expect(
            $comparePointCaretNext(
              // These are no-op when isBefore is correct
              $getCaretInDirection(caretRange.anchor, 'next'),
              $getCaretInDirection(caretRange.focus, 'next'),
            ),
          ).toBe(-1);
          expect(selection.anchor.isBefore(selection.focus)).toBe(true);
          expect(selection.focus.isBefore(selection.anchor)).toBe(false);
        },
        {discrete: true},
      );
    });
  });

  describe('Shadow DOM support', () => {
    initializeUnitTest(() => {
      describe('Shadow DOM word boundary logic', () => {
        test('should correctly identify word boundaries for backward deletion', () => {
          // Test cases for word boundary logic
          const testCases = [
            {
              description: 'cursor after word',
              // after "world"
              expected: {deletedText: 'world', startOffset: 6},

              offset: 11,

              text: 'Hello world test',
            },
            {
              description: 'cursor after punctuation',
              // after "example."
              expected: {deletedText: '.', startOffset: 12},

              offset: 13,

              text: 'test.example.com',
            },
            {
              description: 'cursor in whitespace',
              // in multiple spaces
              expected: {deletedText: 'Hello   ', startOffset: 0},

              offset: 8,

              text: 'Hello   world',
            },
          ];

          testCases.forEach(({text, offset, expected, description}) => {
            // Simulate the word boundary logic from deleteWord
            let startOffset = offset;
            const wordCharRegex = /\w/;

            if (startOffset > 0) {
              const charBeforeCursor = text[startOffset - 1];

              if (/\s/.test(charBeforeCursor)) {
                // Skip whitespace to find the word before it
                while (startOffset > 0 && /\s/.test(text[startOffset - 1])) {
                  startOffset--;
                }
                // Then delete the word before the whitespace
                while (
                  startOffset > 0 &&
                  wordCharRegex.test(text[startOffset - 1])
                ) {
                  startOffset--;
                }
              } else if (wordCharRegex.test(charBeforeCursor)) {
                // Delete to beginning of word
                while (
                  startOffset > 0 &&
                  wordCharRegex.test(text[startOffset - 1])
                ) {
                  startOffset--;
                }
              } else {
                // Delete just that character
                startOffset--;
              }
            }

            const deletedText = text.slice(startOffset, offset);

            expect(startOffset).toBe(expected.startOffset);
            expect(deletedText).toBe(expected.deletedText);
          });
        });

        test('should correctly identify word boundaries for forward deletion', () => {
          // Test cases for forward word deletion logic
          const testCases = [
            {
              description: 'cursor after space before word',
              // after "Hello "
              expected: {deletedText: 'world', endOffset: 11},

              offset: 6,

              text: 'Hello world test',
            },
            {
              description: 'cursor at beginning of text',
              // at beginning
              expected: {deletedText: 'Hello', endOffset: 5},

              offset: 0,

              text: 'Hello world test',
            },
            {
              description: 'cursor before punctuation',
              // after "test"
              expected: {deletedText: '.', endOffset: 5},

              offset: 4,

              text: 'test.example.com',
            },
          ];

          testCases.forEach(({text, offset, expected, description}) => {
            // Simulate the forward word boundary logic from deleteWord
            let endOffset = offset;
            const wordCharRegex = /\w/;

            if (endOffset < text.length) {
              const charAfterCursor = text[endOffset];

              if (/\s/.test(charAfterCursor)) {
                // Skip whitespace first
                while (endOffset < text.length && /\s/.test(text[endOffset])) {
                  endOffset++;
                }
                // Then delete the word
                while (
                  endOffset < text.length &&
                  wordCharRegex.test(text[endOffset])
                ) {
                  endOffset++;
                }
              } else if (wordCharRegex.test(charAfterCursor)) {
                // Delete word characters
                while (
                  endOffset < text.length &&
                  wordCharRegex.test(text[endOffset])
                ) {
                  endOffset++;
                }
              } else {
                // Delete one character
                endOffset++;
              }
            }

            const deletedText = text.slice(offset, endOffset);

            expect(endOffset).toBe(expected.endOffset);
            expect(deletedText).toBe(expected.deletedText);
          });
        });
      });

      describe('Shadow DOM character deletion logic', () => {
        test('should correctly handle character deletion boundaries', () => {
          // Test cases for character deletion logic
          const testCases = [
            {
              description: 'backward character deletion',
              expected: {newOffset: 4, newText: 'Hell world'},
              // after "Hello"
              isBackward: true,

              offset: 5,

              text: 'Hello world',
            },
            {
              description: 'forward character deletion',
              expected: {newOffset: 5, newText: 'Helloworld'},
              // after "Hello"
              isBackward: false,

              offset: 5,

              text: 'Hello world',
            },
            {
              description: 'backward deletion at start (no change)',
              expected: {newOffset: 0, newText: 'Test'},
              // at beginning
              isBackward: true,

              offset: 0,

              text: 'Test',
            },
            {
              description: 'forward deletion at end (no change)',
              expected: {newOffset: 4, newText: 'Test'},
              // at end
              isBackward: false,

              offset: 4,

              text: 'Test',
            },
          ];

          testCases.forEach(
            ({text, offset, isBackward, expected, description}) => {
              let newOffset = offset;
              let newText = text;

              // Simulate character deletion logic
              if (isBackward && offset > 0) {
                newText = text.slice(0, offset - 1) + text.slice(offset);
                newOffset = offset - 1;
              } else if (!isBackward && offset < text.length) {
                newText = text.slice(0, offset) + text.slice(offset + 1);
                // newOffset stays the same for forward deletion
              }

              expect(newText).toBe(expected.newText);
              expect(newOffset).toBe(expected.newOffset);
            },
          );
        });
      });

      describe('Shadow DOM line deletion logic', () => {
        test('should correctly handle line deletion boundaries', () => {
          // Test cases for line deletion logic
          const testCases = [
            {
              description: 'backward line deletion (cmd+backspace)',
              expected: {newOffset: 0, newText: 'test line'},
              // in the middle (after "This is a")
              isBackward: true,

              offset: 10,

              text: 'This is a test line',
            },
            {
              description: 'forward line deletion (cmd+delete)',
              expected: {newOffset: 10, newText: 'This is a '},
              // in the middle
              isBackward: false,

              offset: 10,

              text: 'This is a test line',
            },
            {
              description: 'backward line deletion at start (no change)',
              expected: {newOffset: 0, newText: 'Single line'},
              // at beginning
              isBackward: true,

              offset: 0,

              text: 'Single line',
            },
            {
              description: 'forward line deletion at end (no change)',
              expected: {newOffset: 11, newText: 'Single line'},
              // at end
              isBackward: false,

              offset: 11,

              text: 'Single line',
            },
          ];

          testCases.forEach(
            ({text, offset, isBackward, expected, description}) => {
              let newOffset = offset;
              let newText = text;

              // Simulate line deletion logic
              if (isBackward && offset > 0) {
                // Delete from beginning of line to cursor
                newText = text.slice(offset);
                newOffset = 0;
              } else if (!isBackward && offset < text.length) {
                // Delete from cursor to end of line
                newText = text.slice(0, offset);
                // newOffset stays the same for forward deletion
              }

              expect(newText).toBe(expected.newText);
              expect(newOffset).toBe(expected.newOffset);
            },
          );
        });
      });

      describe('Shadow DOM helper functions', () => {
        let mockShadowRoot: ShadowRoot;
        let testElement: HTMLDivElement;

        beforeEach(() => {
          testElement = document.createElement('div');
          mockShadowRoot = testElement.attachShadow({mode: 'open'});
        });

        test('isShadowRoot should correctly identify ShadowRoot', () => {
          expect(isShadowRoot(mockShadowRoot)).toBe(true);
          expect(isShadowRoot(document)).toBe(false);
          expect(isShadowRoot(testElement)).toBe(false);
        });

        test('getShadowRootOrDocument should return ShadowRoot when element is in shadow DOM', () => {
          const shadowElement = document.createElement('div');
          mockShadowRoot.appendChild(shadowElement);

          const result = getShadowRootOrDocument(shadowElement);
          expect(result).toBe(mockShadowRoot);
        });

        test('getShadowRootOrDocument should return Document when element is not in shadow DOM', () => {
          const normalElement = document.createElement('div');
          document.body.appendChild(normalElement);

          const result = getShadowRootOrDocument(normalElement);
          expect(result).toBe(document);

          // Cleanup
          document.body.removeChild(normalElement);
        });

        test('getShadowRootOrDocument should return document for disconnected elements', () => {
          const disconnectedElement = document.createElement('div');

          const result = getShadowRootOrDocument(disconnectedElement);
          expect(result).toBe(document);
        });
      });
    });
  });
});
