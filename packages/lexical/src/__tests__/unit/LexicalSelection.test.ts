/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode, $isLinkNode} from '@lexical/link';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isTextNode,
  $setSelection,
  createEditor,
  ElementNode,
  LexicalEditor,
  ParagraphNode,
  RangeSelection,
  TextNode,
} from 'lexical';

import {SerializedElementNode} from '../..';
import {$assertRangeSelection, initializeUnitTest, invariant} from '../utils';

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
            ? '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><a href="https://" dir="ltr"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">b</span></p></div>'
            : mode === 'mid-paragraph'
            ? '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">a</span><a href="https://" dir="ltr"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">c</span></p></div>'
            : '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">a</span><a href="https://" dir="ltr"><span data-lexical-text="true">b</span></a></p></div>';

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
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">x</span><a href="https://" dir="ltr"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">b</span></p></div>',
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
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">ax</span><a href="https://" dir="ltr"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">c</span></p></div>',
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
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">ax</span><a href="https://" dir="ltr"><span data-lexical-text="true">b</span></a></p></div>',
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
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><a href="https://" dir="ltr"><span data-lexical-text="true">a</span></a><span data-lexical-text="true">xb</span></p></div>',
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
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">a</span><a href="https://" dir="ltr"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">xc</span></p></div>',
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
              '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">a</span><a href="https://" dir="ltr"><span data-lexical-text="true">b</span></a><span data-lexical-text="true">x</span></p></div>',
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
              sel.removeText();
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
