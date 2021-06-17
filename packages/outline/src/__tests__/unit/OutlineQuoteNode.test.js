/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {QuoteNode, createQuoteNode} from 'outline/QuoteNode';
import {ParagraphNode} from 'outline/ParagraphNode';
import {TextNode} from 'outline';
import {initializeUnitTest} from '../utils';

const editorThemeClasses = Object.freeze({
  quote: 'my-quote-class',
});

describe('OutlineQuoteNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('QuoteNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = new QuoteNode();
        expect(quoteNode.getFlags()).toBe(0);
        expect(quoteNode.getType()).toBe('quote');
        expect(quoteNode.getTextContent()).toBe('');
      });
      expect(() => new QuoteNode()).toThrow();
    });

    test('QuoteNode.clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = new QuoteNode();
        const textNode = new TextNode('foo');
        quoteNode.append(textNode);
        const quoteNodeClone = quoteNode.clone();
        expect(quoteNodeClone).not.toBe(quoteNode);
        expect(quoteNode.__type).toEqual(quoteNodeClone.__type);
        expect(quoteNode.__flags).toEqual(quoteNodeClone.__flags);
        expect(quoteNode.__parent).toEqual(quoteNodeClone.__parent);
        expect(quoteNode.__children).toEqual(quoteNodeClone.__children);
        expect(quoteNode.__key).not.toEqual(quoteNodeClone.__key);
        expect(quoteNode.getTextContent()).toEqual(
          quoteNodeClone.getTextContent(),
        );
      });
    });

    test('QuoteNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = new QuoteNode();
        expect(quoteNode.createDOM(editorThemeClasses).outerHTML).toBe(
          '<blockquote class="my-quote-class"></blockquote>',
        );
        expect(quoteNode.createDOM({}).outerHTML).toBe(
          '<blockquote></blockquote>',
        );
      });
    });

    test('QuoteNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = new QuoteNode();
        const domElement = quoteNode.createDOM(editorThemeClasses);
        expect(domElement.outerHTML).toBe(
          '<blockquote class="my-quote-class"></blockquote>',
        );
        const newQuoteNode = new QuoteNode();
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
      await editor.update((view) => {
        const root = view.getRoot();
        quoteNode = new QuoteNode();
        root.append(quoteNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><blockquote></blockquote></div>',
      );
      await editor.update((view) => {
        const result = quoteNode.insertNewAfter();
        expect(result).toBeInstanceOf(ParagraphNode);
        expect(result.getDirection()).toEqual(quoteNode.getDirection());
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><blockquote></blockquote><p></p></div>',
      );
    });

    test('QuoteNode.canInsertTab()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = new QuoteNode();
        expect(quoteNode.canInsertTab()).toBe(false);
      });
    });

    test('createQuoteNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const quoteNode = new QuoteNode();
        const createdQuoteNode = createQuoteNode();
        expect(quoteNode.__type).toEqual(createdQuoteNode.__type);
        expect(quoteNode.__flags).toEqual(createdQuoteNode.__flags);
        expect(quoteNode.__parent).toEqual(createdQuoteNode.__parent);
        expect(quoteNode.__key).not.toEqual(createdQuoteNode.__key);
      });
    });
  });
});
