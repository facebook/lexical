/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createLinkNode, $isLinkNode, type LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  type ListItemNode,
  type ListNode,
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
  $isDecoratorNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $selectAll,
  $setCompositionKey,
  $setSelection,
  createEditor,
  ElementNode,
  getDOMSelection,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type RangeSelection,
  type TextNode,
} from 'lexical';
import {assert, beforeEach, describe, expect, test} from 'vitest';

import {$internalCreateRangeSelection} from '../../LexicalSelection';
import {
  $assertNodeType,
  $assertRangeSelection,
  $createTestDecoratorNode,
  $createTestInlineElementNode,
  $createTestShadowRootNode,
  $isTestShadowRootNode,
  initializeUnitTest,
  invariant,
} from '../utils';

function mapLatest<T extends LexicalNode>(nodes: T[]): T[] {
  return nodes.map(node => node.getLatest());
}

describe('LexicalSelection tests', () => {
  initializeUnitTest(testEnv => {
    describe('Inserting text either side of inline elements', () => {
      const setup = async (
        mode: 'start-of-paragraph' | 'mid-paragraph' | 'end-of-paragraph',
      ) => {
        const {container, editor} = testEnv;

        if (!container) {
          throw new Error('Expected container to be truthy');
        }

        await editor.update(() => {
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
            await editor.update(() => {
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

          test('Can insert text before a start-of-paragraph inline element, using insertNodes', async () => {
            const {container, editor} = await setup('start-of-paragraph');

            await insertText({container, editor, method: 'insertNodes'});
          });
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
            await editor.update(() => {
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
            await editor.update(() => {
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
            await editor.update(() => {
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

          test('Can insert text after a start-of-paragraph inline element, using insertNodes', async () => {
            const {container, editor} = await setup('start-of-paragraph');

            await insertText({container, editor, method: 'insertNodes'});
          });
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
            await editor.update(() => {
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

          test('Can insert text after a mid-paragraph inline element, using insertNodes', async () => {
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
            await editor.update(() => {
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

          test('Can insert text after an end-of-paragraph inline element, using insertNodes', async () => {
            const {container, editor} = await setup('end-of-paragraph');

            await insertText({container, editor, method: 'insertNodes'});
          });
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
              expect(allTextNodes.map(node => node.getTextContent())).toEqual([
                'lead',
              ]);
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
              expect(allTextNodes.map(node => node.getTextContent())).toEqual([
                'ing text',
              ]);
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
              expect(allTextNodes.map(node => node.getTextContent())).toEqual([
                'text',
              ]);
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
              expect(allTextNodes.map(node => node.getTextContent())).toEqual([
                'lead',
                'text',
              ]);
              const selection = $assertRangeSelection($getSelection());
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.key).toBe(leadingText.getKey());
              expect(selection.anchor.offset).toBe('lead'.length);
            },
            {discrete: true},
          );
          testEnv.editor.read('latest', () => {
            const allTextNodes = $getRoot().getAllTextNodes();
            // These should get merged in reconciliation
            expect(allTextNodes.map(node => node.getTextContent())).toEqual([
              'leadtext',
            ]);
            expect(leadingText.isAttached()).toBe(true);
          });
        });
      });
    });
  });
});

describe('Segmented node composition (#5065)', () => {
  initializeUnitTest(testEnv => {
    test('insertText during composition preserves node key', () => {
      testEnv.editor.update(
        () => {
          const segmented = $createTextNode('JohnSmith').setMode('segmented');
          $getRoot().clear().append($createParagraphNode().append(segmented));
          const key = segmented.getKey();

          $setCompositionKey(key);
          const sel = segmented.select(4, 4);
          sel.insertText('');

          const latest = segmented.getLatest();
          expect(latest.getKey()).toBe(key);
          expect(latest.isSegmented()).toBe(false);
          expect(latest.getTextContent()).toBe('JohnSmith');
        },
        {discrete: true},
      );
    });

    test('insertText without composition replaces segmented node', () => {
      testEnv.editor.update(
        () => {
          const segmented = $createTextNode('JohnSmith').setMode('segmented');
          $getRoot().clear().append($createParagraphNode().append(segmented));

          const sel = segmented.select(4, 4);
          sel.insertText('');

          expect(segmented.isAttached()).toBe(false);
          const allText = $getRoot().getAllTextNodes();
          expect(allText).toHaveLength(1);
          expect(allText[0].getKey()).not.toBe(segmented.getKey());
          expect(allText[0].getTextContent()).toBe('JohnSmith');
        },
        {discrete: true},
      );
    });

    test('insertText during composition preserves format and style', () => {
      testEnv.editor.update(
        () => {
          const segmented = $createTextNode('JohnSmith')
            .setMode('segmented')
            .setFormat('bold');
          $getRoot().clear().append($createParagraphNode().append(segmented));
          const key = segmented.getKey();

          $setCompositionKey(key);
          const sel = segmented.select(4, 4);
          sel.format = 1; // bold
          sel.insertText('');

          const latest = segmented.getLatest();
          expect(latest.isAttached()).toBe(true);
          expect(latest.getKey()).toBe(key);
          expect(latest.getFormat()).toBe(1);
        },
        {discrete: true},
      );
    });
  });
});

describe('Regression tests for #6701', () => {
  test('insertNodes fails an invariant when there is no Block ancestor', async () => {
    class InlineElementNode extends ElementNode {
      $config() {
        return this.config('inline-element-node', {extends: ElementNode});
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
      onError: err => {
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

describe('Regression tests for #8707', () => {
  // A shadow root that holds block-level children directly (e.g. a
  // decorator-only container). Placing the caret adjacent to a block child
  // shows the block cursor, whose RangeSelection is a collapsed element point
  // on the shadow root itself. Inserting block-level content there (such as
  // pasting a copied decorator) used to throw because a shadow root has no
  // block ancestor to split. Roots and shadow roots hold blocks directly, so
  // the block goes straight in at the anchor offset with no paragraph wrapper.
  initializeUnitTest(testEnv => {
    test('inserts a block decorator after the block cursor at the end of a shadow root', () => {
      const {editor} = testEnv;
      let shadowKey = '';
      editor.update(
        () => {
          const shadow = $createTestShadowRootNode();
          shadow.append($createTestDecoratorNode().setIsInline(false));
          $getRoot().clear().append(shadow);
          shadowKey = shadow.getKey();
          // Block cursor: collapsed element point after the decorator.
          shadow.select(1, 1);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'Expected RangeSelection');
          selection.insertNodes([
            $createTestDecoratorNode().setIsInline(false),
          ]);
        },
        {discrete: true},
      );

      editor.read(() => {
        const root = $getRoot();
        // The decorator landed in the same shadow root as the block cursor,
        // not the outer document root.
        expect(root.getChildrenSize()).toBe(1);
        const shadow = root.getFirstChildOrThrow();
        invariant($isTestShadowRootNode(shadow), 'Expected shadow root');
        expect(shadow.getKey()).toBe(shadowKey);
        const children = shadow.getChildren();
        expect(children).toHaveLength(2);
        expect(children.every($isDecoratorNode)).toBe(true);
      });
    });

    test('inserts a block decorator before the block cursor at the start of a shadow root', () => {
      const {editor} = testEnv;
      let existingKey = '';
      editor.update(
        () => {
          const shadow = $createTestShadowRootNode();
          const existing = $createTestDecoratorNode().setIsInline(false);
          shadow.append(existing);
          $getRoot().clear().append(shadow);
          existingKey = existing.getKey();
          // Block cursor: collapsed element point before the decorator.
          shadow.select(0, 0);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'Expected RangeSelection');
          selection.insertNodes([
            $createTestDecoratorNode().setIsInline(false),
          ]);
        },
        {discrete: true},
      );

      editor.read(() => {
        const shadow = $getRoot().getFirstChildOrThrow();
        invariant($isTestShadowRootNode(shadow), 'Expected shadow root');
        const children = shadow.getChildren();
        expect(children).toHaveLength(2);
        expect(children.every($isDecoratorNode)).toBe(true);
        // Inserted before the pre-existing decorator.
        expect(children[1].getKey()).toBe(existingKey);
      });
    });

    test('inserts a block decorator into an empty shadow root', () => {
      const {editor} = testEnv;
      editor.update(
        () => {
          const shadow = $createTestShadowRootNode();
          $getRoot().clear().append(shadow);
          shadow.select(0, 0);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'Expected RangeSelection');
          selection.insertNodes([
            $createTestDecoratorNode().setIsInline(false),
          ]);
        },
        {discrete: true},
      );

      editor.read(() => {
        const shadow = $getRoot().getFirstChildOrThrow();
        invariant($isTestShadowRootNode(shadow), 'Expected shadow root');
        const children = shadow.getChildren();
        expect(children).toHaveLength(1);
        expect($isDecoratorNode(children[0])).toBe(true);
      });
    });

    test('inserts a block element at the block cursor inside a shadow root', () => {
      const {editor} = testEnv;
      editor.update(
        () => {
          const shadow = $createTestShadowRootNode();
          shadow.append($createTestDecoratorNode().setIsInline(false));
          $getRoot().clear().append(shadow);
          shadow.select(1, 1);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'Expected RangeSelection');
          selection.insertNodes([
            $createParagraphNode().append($createTextNode('inserted')),
          ]);
        },
        {discrete: true},
      );

      editor.read(() => {
        const shadow = $getRoot().getFirstChildOrThrow();
        invariant($isTestShadowRootNode(shadow), 'Expected shadow root');
        const children = shadow.getChildren();
        expect(children).toHaveLength(2);
        expect($isDecoratorNode(children[0])).toBe(true);
        expect($isParagraphNode(children[1])).toBe(true);
        expect(children[1].getTextContent()).toBe('inserted');
      });
    });

    test('insertParagraph at an element point on a shadow root seeds into that shadow root', () => {
      const {editor} = testEnv;
      editor.update(
        () => {
          const shadow = $createTestShadowRootNode();
          shadow.append($createTestDecoratorNode().setIsInline(false));
          $getRoot().clear().append(shadow);
          shadow.select(1, 1);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'Expected RangeSelection');
          const paragraph = selection.insertParagraph();
          invariant(paragraph !== null, 'Expected a paragraph to be inserted');
          expect(paragraph.getParent()!.is($getRoot().getFirstChild())).toBe(
            true,
          );
        },
        {discrete: true},
      );

      editor.read(() => {
        const root = $getRoot();
        expect(root.getChildrenSize()).toBe(1);
        const shadow = root.getFirstChildOrThrow();
        invariant($isTestShadowRootNode(shadow), 'Expected shadow root');
        expect(shadow.getChildrenSize()).toBe(2);
        expect($isParagraphNode(shadow.getLastChild())).toBe(true);
      });
    });

    test('inserts a block decorator at a root element point without wrapping it in a paragraph', () => {
      const {editor} = testEnv;
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('existing')));
          // Element point directly on the root, after the paragraph.
          $getRoot().select(1, 1);
        },
        {discrete: true},
      );

      editor.update(
        () => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'Expected RangeSelection');
          selection.insertNodes([
            $createTestDecoratorNode().setIsInline(false),
          ]);
        },
        {discrete: true},
      );

      editor.read(() => {
        const children = $getRoot().getChildren();
        // The decorator is a direct child of root; no empty paragraph wrapper
        // was created for it.
        expect(children).toHaveLength(2);
        expect($isParagraphNode(children[0])).toBe(true);
        expect($isDecoratorNode(children[1])).toBe(true);
      });
    });
  });
});

describe('getNodes()', () => {
  initializeUnitTest(testEnv => {
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
              ].map(node => node.getLatest()),
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
              ].map(node => node.getLatest()),
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
              ].map(node => node.getLatest()),
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
              ].map(node => node.getLatest()),
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
              ].map(n => n.getLatest()),
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
            [inlineDecoratorTrailing].map(node => node.getLatest()),
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
            [inlineDecoratorTrailing].map(node => node.getLatest()),
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
            ].map(node => node.getLatest()),
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
  initializeUnitTest(testEnv => {
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
  initializeUnitTest(testEnv => {
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
  initializeUnitTest(testEnv => {
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
  initializeUnitTest(testEnv => {
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
});

describe('Regression #8067', () => {
  initializeUnitTest(testEnv => {
    test('Formatting issue when replacing text with format', () => {
      testEnv.editor.update(
        () => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const firstNode = $createTextNode('hello');
          firstNode.toggleFormat('bold');
          const lastNode = $createTextNode(' world!');
          paragraph.append(firstNode, lastNode);
          root.clear().append(paragraph);
          const selection = $selectAll();
          selection.insertText('hello');
          const children = $assertNodeType(
            paragraph.getChildren()[0],
            $isTextNode,
          );
          expect(children.getTextContent()).toBe('hello');
          expect(children.hasFormat('bold')).toBe(true);
        },
        {discrete: true},
      );
    });
  });
});

describe('RangeSelection.isBackward() caching (#5825)', () => {
  initializeUnitTest(testEnv => {
    test('caches the result and invalidates on Point mutations', () => {
      const {editor} = testEnv;
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          const text = $createTextNode('hello');
          paragraph.append(text);
          root.append(paragraph);

          const selection = text.select(0, 5);
          expect(selection._cachedIsBackward).toBeNull();

          // First call computes and caches.
          expect(selection.isBackward()).toBe(false);
          expect(selection._cachedIsBackward).toBe(false);

          // Hits the cache without recomputing.
          expect(selection.isBackward()).toBe(false);

          // setTextNodeRange routes through anchor.set + focus.set,
          // invalidating the cache.
          selection.setTextNodeRange(text, 5, text, 0);
          expect(selection._cachedIsBackward).toBeNull();

          // anchor=5, focus=0 → now backward, recomputed and re-cached.
          expect(selection.isBackward()).toBe(true);
          expect(selection._cachedIsBackward).toBe(true);
        },
        {discrete: true},
      );
    });
  });
});

describe('Regression #8098', () => {
  initializeUnitTest(testEnv => {
    test('Do not apply format and style when moving to different node', async () => {
      const {editor} = testEnv;
      let normalTextKey: string;

      await editor.update(
        () => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const firstNode = $createTextNode('가다');
          firstNode.toggleFormat('bold');
          const lastNode = $createTextNode('라바');
          paragraph.append(firstNode, lastNode);
          root.clear().append(paragraph);
          firstNode.select(0, 0).format = 1;
          normalTextKey = lastNode.getKey();
        },
        {discrete: true},
      );

      const domSelection = getDOMSelection(editor._window ?? window);
      const range = document.createRange();
      range.setStart(editor.getElementByKey(normalTextKey!)!.firstChild!, 1);
      range.collapse(true);
      domSelection?.removeAllRanges();
      domSelection?.addRange(range);

      await editor.update(
        () => {
          const selection = $internalCreateRangeSelection(
            $getSelection(),
            domSelection,
            editor,
            {type: 'selectionchange'} as Event,
          );
          expect(selection).not.toBeNull();
          expect(selection!.format).toBe(0);
          expect(selection!.style).toBe('');
        },
        {discrete: true},
      );
    });
  });
});

describe('$wrapInlineNodes regression', () => {
  initializeUnitTest(testEnv => {
    test('Wraps all inline nodes, preserving first linebreak if contain a block element', () => {
      testEnv.editor.update(
        () => {
          $getRoot().clear();
          const selection = $selectAll();

          const inlineNodes = [
            $createLineBreakNode(),
            $createTextNode('p1'),
            $createTextNode('p1').setFormat('bold'),
          ];
          selection.insertNodes([...inlineNodes, $createParagraphNode()]);

          const children = $getRoot().getChildren();
          expect(children).toHaveLength(2);
          assert($isParagraphNode(children[0]));
          expect(children[0].getChildren()).toEqual(inlineNodes);
        },
        {discrete: true},
      );
    });

    test('Collapses a lone linebreak run into an empty paragraph at the end of a non-empty paragraph', () => {
      testEnv.editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode().append(
            $createTextNode('abc'),
          );
          root.append(paragraph);

          paragraph
            .selectEnd()
            .insertNodes([
              $createLineBreakNode(),
              $createParagraphNode().append($createTextNode('x')),
            ]);

          const children = root.getChildren();
          expect(children).toHaveLength(3);
          assert($isParagraphNode(children[0]));
          expect(children[0].getTextContent()).toBe('abc');
          assert($isParagraphNode(children[1]));
          expect(children[1].getChildrenSize()).toBe(0);
          assert($isParagraphNode(children[2]));
          expect(children[2].getTextContent()).toBe('x');
        },
        {discrete: true},
      );
    });

    test('Preserves a linebreak followed by inline content when merging into a non-empty paragraph', () => {
      testEnv.editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode().append(
            $createTextNode('abc'),
          );
          root.append(paragraph);

          paragraph
            .selectEnd()
            .insertNodes([
              $createLineBreakNode(),
              $createTextNode('tail'),
              $createParagraphNode().append($createTextNode('x')),
            ]);

          const children = root.getChildren();
          expect(children).toHaveLength(2);
          assert($isParagraphNode(children[0]));
          expect(
            children[0].getChildren().map(child => child.getType()),
          ).toEqual(['text', 'linebreak', 'text']);
          expect(children[0].getTextContent()).toBe('abc\ntail');
          assert($isParagraphNode(children[1]));
          expect(children[1].getTextContent()).toBe('x');
        },
        {discrete: true},
      );
    });

    test('Collapses a lone trailing linebreak after a block into an empty paragraph', () => {
      testEnv.editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          paragraph
            .selectEnd()
            .insertNodes([
              $createParagraphNode().append($createTextNode('x')),
              $createLineBreakNode(),
            ]);

          const children = root.getChildren();
          expect(children).toHaveLength(2);
          assert($isParagraphNode(children[0]));
          expect(children[0].getTextContent()).toBe('x');
          assert($isParagraphNode(children[1]));
          expect(children[1].getChildrenSize()).toBe(0);
        },
        {discrete: true},
      );
    });
  });
});

describe('Regression #7551 - Selection boundary normalization for single-child inline elements', () => {
  initializeUnitTest(testEnv => {
    test('collapsed selection at end of single-child inline element stays inside', async () => {
      const {editor} = testEnv;
      let linkTextKey: string;

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        const before = $createTextNode('hello ');
        const linkText = $createTextNode('A');
        const link = $createLinkNode('https://example.com', {}).append(
          linkText,
        );
        const after = $createTextNode(' world');
        paragraph.append(before, link, after);
        root.append(paragraph);
        linkTextKey = linkText.__key;
      });

      editor.update(
        () => {
          const domSelection = getDOMSelection(editor._window ?? window);
          const linkTextDOM = editor.getElementByKey(linkTextKey)!.firstChild!;
          const range = document.createRange();
          range.setStart(linkTextDOM, 1);
          range.collapse(true);
          domSelection?.removeAllRanges();
          domSelection?.addRange(range);

          const selection = $internalCreateRangeSelection(
            $getSelection(),
            domSelection,
            editor,
            {type: 'selectionchange'} as Event,
          );
          invariant(selection !== null);
          const {anchor} = selection;
          const anchorNode = anchor.getNode();
          invariant($isTextNode(anchorNode));
          const parent = anchorNode.getParent();
          invariant($isLinkNode(parent));
          expect(anchor.offset).toBe(1);
        },
        {discrete: true},
      );
    });

    test('collapsed selection at end of multi-child inline element normalizes to next sibling', async () => {
      const {editor} = testEnv;
      let boldBKey: string;

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        const before = $createTextNode('hello ');
        const boldB = $createTextNode('B').toggleFormat('bold');
        const link = $createLinkNode('https://example.com', {}).append(
          $createTextNode('A'),
          boldB,
        );
        const after = $createTextNode(' world');
        paragraph.append(before, link, after);
        root.append(paragraph);
        boldBKey = boldB.__key;
      });

      editor.update(
        () => {
          const domSelection = getDOMSelection(editor._window ?? window);
          const boldBDOM = editor.getElementByKey(boldBKey)!.firstChild!;
          const range = document.createRange();
          range.setStart(boldBDOM, 1);
          range.collapse(true);
          domSelection?.removeAllRanges();
          domSelection?.addRange(range);

          const selection = $internalCreateRangeSelection(
            $getSelection(),
            domSelection,
            editor,
            {type: 'selectionchange'} as Event,
          );
          invariant(selection !== null);
          const {anchor} = selection;
          const anchorNode = anchor.getNode();
          invariant($isTextNode(anchorNode));
          expect(anchorNode.getTextContent()).toBe(' world');
          expect(anchor.offset).toBe(0);
        },
        {discrete: true},
      );
    });
  });
});
