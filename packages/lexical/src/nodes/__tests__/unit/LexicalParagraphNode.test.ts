/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getClipboardDataFromSelection,
  $insertDataTransferForRichText,
  setLexicalClipboardDataTransfer,
} from '@lexical/clipboard';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  ParagraphNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  DataTransferMock,
  initializeUnitTest,
  invariant,
} from '../../../__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    paragraph: 'my-paragraph-class',
  },
});

describe('LexicalParagraphNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('ParagraphNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraphNode = new ParagraphNode();

        expect(paragraphNode.getType()).toBe('paragraph');
        expect(paragraphNode.getTextContent()).toBe('');
      });
      expect(() => new ParagraphNode()).toThrow();
    });

    test('ParagraphNode.exportJSON() should return and object conforming to the expected schema', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const node = $createParagraphNode();

        // If you broke this test, you changed the public interface of a
        // serialized Lexical Core Node. Please ensure the correct adapter
        // logic is in place in the corresponding importJSON  method
        // to accommodate these changes.
        expect(node.exportJSON()).toStrictEqual({
          children: [],
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          type: 'paragraph',
          version: 1,
        });
      });
    });

    test('ParagraphNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraphNode = new ParagraphNode();

        expect(paragraphNode.createDOM(editorConfig).outerHTML).toBe(
          '<p class="my-paragraph-class"></p>',
        );
        expect(
          paragraphNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe('<p></p>');
      });
    });

    test('ParagraphNode.updateDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        const domElement = paragraphNode.createDOM(editorConfig);

        expect(domElement.outerHTML).toBe('<p class="my-paragraph-class"></p>');

        const newParagraphNode = new ParagraphNode();
        const result = newParagraphNode.updateDOM(
          paragraphNode,
          domElement,
          editorConfig,
        );

        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<p class="my-paragraph-class"></p>');
      });
    });

    test('ParagraphNode.insertNewAfter()', async () => {
      const {editor} = testEnv;
      let paragraphNode: ParagraphNode;

      await editor.update(() => {
        const root = $getRoot();
        paragraphNode = new ParagraphNode();
        root.append(paragraphNode);
      });

      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><br></p></div>',
      );

      await editor.update(() => {
        const selection = paragraphNode.select();
        const result = paragraphNode.insertNewAfter(selection, false);
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(paragraphNode.getDirection());
        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><br></p></div>',
        );
      });
    });

    test('$createParagraphNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraphNode = new ParagraphNode();
        const createdParagraphNode = $createParagraphNode();

        expect(paragraphNode.__type).toEqual(createdParagraphNode.__type);
        expect(paragraphNode.__parent).toEqual(createdParagraphNode.__parent);
        expect(paragraphNode.__key).not.toEqual(createdParagraphNode.__key);
      });
    });

    test('$isParagraphNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const paragraphNode = new ParagraphNode();

        expect($isParagraphNode(paragraphNode)).toBe(true);
      });
    });

    test('Paragraph alignment is preserved when pasting via HTML', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const destParagraph = $createParagraphNode();
        const textNode = $createTextNode('Destination');
        destParagraph.append(textNode);
        root.append(destParagraph);
        textNode.select();
      });

      // Paste a paragraph with center alignment
      const dataTransfer = new DataTransferMock();
      dataTransfer.setData(
        'text/html',
        '<p style="text-align: center;">Centered text</p>',
      );

      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        $insertDataTransferForRichText(dataTransfer, selection, editor);
      });

      await editor.getEditorState().read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        // Should have two paragraphs: destination and pasted
        expect(children.length).toBe(2);
        const pastedParagraph = children[1];
        invariant(
          $isParagraphNode(pastedParagraph),
          'Expected pasted paragraph',
        );
        expect(pastedParagraph.getFormatType()).toBe('center');
        expect(pastedParagraph.getTextContent()).toBe('Centered text');
      });
    });

    test('Paragraph alignment is preserved when pasting via JSON', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const destParagraph = $createParagraphNode();
        const textNode = $createTextNode('Destination');
        destParagraph.append(textNode);
        root.append(destParagraph);
        textNode.select();
      });

      // Paste a paragraph with right alignment via JSON
      const dataTransfer = new DataTransferMock();
      const lexicalData = JSON.stringify({
        namespace: editor._config.namespace,
        nodes: [
          {
            children: [
              {
                children: [],
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Right aligned',
                type: 'text',
                version: 1,
              },
            ],
            direction: null,
            format: 'right',
            indent: 0,
            textFormat: 0,
            textStyle: '',
            type: 'paragraph',
            version: 1,
          },
        ],
      });
      dataTransfer.setData('application/x-lexical-editor', lexicalData);

      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        $insertDataTransferForRichText(dataTransfer, selection, editor);
      });

      await editor.getEditorState().read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        // Should have two paragraphs: destination and pasted
        expect(children.length).toBe(2);
        const pastedParagraph = children[1];
        invariant(
          $isParagraphNode(pastedParagraph),
          'Expected pasted paragraph',
        );
        expect(pastedParagraph.getFormatType()).toBe('right');
        expect(pastedParagraph.getTextContent()).toBe('Right aligned');
      });
    });

    test('Paragraph alignment is preserved when pasting justify-aligned paragraph', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const destParagraph = $createParagraphNode();
        const textNode = $createTextNode('Destination');
        destParagraph.append(textNode);
        root.append(destParagraph);
        textNode.select();
      });

      // Paste a paragraph with justify alignment
      const dataTransfer = new DataTransferMock();
      dataTransfer.setData(
        'text/html',
        '<p style="text-align: justify;">Justified text</p>',
      );

      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        $insertDataTransferForRichText(dataTransfer, selection, editor);
      });

      await editor.getEditorState().read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        // Should have two paragraphs: destination and pasted
        expect(children.length).toBe(2);
        const pastedParagraph = children[1];
        invariant(
          $isParagraphNode(pastedParagraph),
          'Expected pasted paragraph',
        );
        expect(pastedParagraph.getFormatType()).toBe('justify');
        expect(pastedParagraph.getTextContent()).toBe('Justified text');
      });
    });

    test('Copy full aligned paragraph then paste preserves alignment', async () => {
      const {editor} = testEnv;
      let clipboardData: ReturnType<typeof $getClipboardDataFromSelection>;

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.setFormat('center');
        const textNode = $createTextNode('Hello full');
        paragraph.append(textNode);
        root.append(paragraph);
        textNode.select(0, textNode.getTextContentSize());
        clipboardData = $getClipboardDataFromSelection();
      });

      const dataTransfer = new DataTransferMock();
      setLexicalClipboardDataTransfer(
        dataTransfer as unknown as DataTransfer,
        clipboardData!,
      );

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const destParagraph = $createParagraphNode();
        const textNode = $createTextNode('Destination');
        destParagraph.append(textNode);
        root.append(destParagraph);
        textNode.select();

        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        $insertDataTransferForRichText(
          dataTransfer as unknown as DataTransfer,
          selection,
          editor,
        );
      });

      await editor.getEditorState().read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        const maybeParagraph = children.find((child) => {
          return (
            $isParagraphNode(child) && child.getTextContent() === 'Hello full'
          );
        });
        invariant(
          maybeParagraph !== undefined && $isParagraphNode(maybeParagraph),
          'Expected pasted paragraph',
        );
        const pastedParagraph = maybeParagraph;
        expect(pastedParagraph.getFormatType()).toBe('center');
        expect(pastedParagraph.getTextContent()).toBe('Hello full');
      });
    });

    test('Copy partial text from aligned paragraph then paste preserves alignment in new paragraph', async () => {
      const {editor} = testEnv;
      let clipboardData: ReturnType<typeof $getClipboardDataFromSelection>;

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.setFormat('right');
        const textNode = $createTextNode('Hello world');
        paragraph.append(textNode);
        root.append(paragraph);
        textNode.select(0, 5);
        clipboardData = $getClipboardDataFromSelection();
      });

      const dataTransfer = new DataTransferMock();
      setLexicalClipboardDataTransfer(
        dataTransfer as unknown as DataTransfer,
        clipboardData!,
      );

      await editor.update(() => {
        const root = $getRoot();
        root.clear();
        const destParagraph = $createParagraphNode();
        const textNode = $createTextNode('Destination');
        destParagraph.append(textNode);
        root.append(destParagraph);
        textNode.select();

        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        $insertDataTransferForRichText(
          dataTransfer as unknown as DataTransfer,
          selection,
          editor,
        );
      });

      await editor.getEditorState().read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        const maybeParagraph = children.find((child) => {
          return $isParagraphNode(child) && child.getTextContent() === 'Hello';
        });
        invariant(
          maybeParagraph !== undefined && $isParagraphNode(maybeParagraph),
          'Expected pasted paragraph',
        );
        const pastedParagraph = maybeParagraph;
        expect(pastedParagraph.getFormatType()).toBe('right');
        expect(pastedParagraph.getTextContent()).toBe('Hello');
      });
    });
  });
});
