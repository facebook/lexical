/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createQuoteNode} from 'outline/QuoteNode';
import {ParagraphNode} from 'outline/ParagraphNode';
import {getRoot} from 'outline';
import {initializeUnitTest} from '../utils';

const editorConfig = Object.freeze({
  theme: {
    quote: 'my-quote-class',
  },
});

describe('OutlineQuoteNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('QuoteNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = createQuoteNode();
        expect(quoteNode.getFlags()).toBe(0);
        expect(quoteNode.getType()).toBe('quote');
        expect(quoteNode.getTextContent()).toBe('');
      });
      expect(() => createQuoteNode()).toThrow();
    });

    test('QuoteNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = createQuoteNode();
        expect(quoteNode.createDOM(editorConfig).outerHTML).toBe(
          '<blockquote class="my-quote-class"></blockquote>',
        );
        expect(quoteNode.createDOM({theme: {}}).outerHTML).toBe(
          '<blockquote></blockquote>',
        );
      });
    });

    test('QuoteNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = createQuoteNode();
        const domElement = quoteNode.createDOM(editorConfig);
        expect(domElement.outerHTML).toBe(
          '<blockquote class="my-quote-class"></blockquote>',
        );
        const newQuoteNode = createQuoteNode();
        const result = newQuoteNode.updateDOM(quoteNode, domElement);
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe(
          '<blockquote class="my-quote-class"></blockquote>',
        );
      });
    });

    test('QuoteNode.insertNewAfter()', async () => {
      const {editor} = testEnv;
      let quoteNode;
      await editor.update(() => {
        const root = getRoot();
        quoteNode = createQuoteNode();
        root.append(quoteNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><blockquote><br></blockquote></div>',
      );
      await editor.update((state) => {
        const result = quoteNode.insertNewAfter();
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(quoteNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><blockquote><br></blockquote><p><br></p></div>',
      );
    });

    test('QuoteNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = createQuoteNode();
        expect(quoteNode.canInsertTab()).toBe(false);
      });
    });

    test('createQuoteNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = createQuoteNode();
        const createdQuoteNode = createQuoteNode();
        expect(quoteNode.__type).toEqual(createdQuoteNode.__type);
        expect(quoteNode.__flags).toEqual(createdQuoteNode.__flags);
        expect(quoteNode.__parent).toEqual(createdQuoteNode.__parent);
        expect(quoteNode.__key).not.toEqual(createdQuoteNode.__key);
      });
    });
  });
});
