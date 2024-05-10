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
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  LexicalEditor,
  RangeSelection,
} from 'lexical';

import {initializeUnitTest, invariant} from '../utils';

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
  });
});
