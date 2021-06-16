/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {TextNode} from 'outline';
import {ParagraphNode} from 'outline/ParagraphNode';
import {getNodeByKey, OutlineNode} from '../../OutlineNode';

import {
  IS_DIRECTIONLESS,
  IS_IMMUTABLE,
  IS_INERT,
  IS_SEGMENTED,
} from '../../OutlineConstants';

import {initializeUnitTest} from '../utils';

describe('OutlineNode tests', () => {
  initializeUnitTest((testEnv) => {
    let paragraphNode;
    let textNode;

    beforeEach(async () => {
      const {editor} = testEnv;
      await editor.update((view) => {
        const rootNode = view.getRoot();
        paragraphNode = new ParagraphNode();
        textNode = new TextNode('foo');
        paragraphNode.append(textNode);
        rootNode.append(paragraphNode);
      });
    });

    test('OutlineNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode('__custom_key__');
        expect(node.__type).toBe('node');
        expect(node.__flags).toBe(0);
        expect(node.__key).toBe('__custom_key__');
        expect(node.__parent).toBe(null);
      });
      await editor.getViewModel().read(() => {
        expect(() => new OutlineNode()).toThrow();
        expect(() => new OutlineNode('__custom_key__')).not.toThrow();
      });
    });

    test('OutlineNode.clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode('__custom_key__');
        expect(() => node.clone()).toThrow();
      });
    });

    test('OutlineNode.getType()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode('__custom_key__');
        expect(node.getType()).toEqual(node.__type);
      });
    });

    test('OutlineNode.isAttached()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        const node = new OutlineNode('__custom_key__');
        expect(node.isAttached()).toBe(false);
        expect(textNode.isAttached()).toBe(true);
        expect(paragraphNode.isAttached()).toBe(true);
      });
      expect(() => textNode.isAttached()).toThrow();
    });

    test('OutlineNode.isSelected()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        const node = new OutlineNode('__custom_key__');
        expect(node.isSelected()).toBe(false);
        expect(textNode.isSelected()).toBe(false);
        expect(paragraphNode.isSelected()).toBe(false);
      });
      await editor.update(() => {
        textNode.select(0, 0);
      });
      await editor.getViewModel().read(() => {
        expect(textNode.isSelected()).toBe(true);
      });
      expect(() => textNode.isSelected()).toThrow();
    });

    test('OutlineNode.getFlags()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(textNode.getFlags()).toEqual(textNode.getLatest().__flags);
      });
      expect(() => textNode.getFlags()).toThrow();
    });

    test('OutlineNode.getKey()', async () => {
      expect(textNode.getKey()).toEqual(textNode.__key);
    });

    test('OutlineNode.getParent()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(node.getParent()).toBe(null);
      });
      await editor.getViewModel().read((view) => {
        const rootNode = view.getRoot();
        expect(textNode.getParent()).toBe(paragraphNode);
        expect(paragraphNode.getParent()).toBe(rootNode);
      });
      expect(() => textNode.getParent()).toThrow();
    });

    test('OutlineNode.getParentOrThrow()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(() => node.getParentOrThrow()).toThrow();
      });
      await editor.getViewModel().read((view) => {
        const rootNode = view.getRoot();
        expect(textNode.getParent()).toBe(paragraphNode);
        expect(paragraphNode.getParent()).toBe(rootNode);
      });
      expect(() => textNode.getParentOrThrow()).toThrow();
    });

    test('OutlineNode.getParentBlockOrThrow()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(() => node.getParentBlockOrThrow()).toThrow();
      });
      await editor.getViewModel().read(() => {
        expect(textNode.getParentBlockOrThrow()).toBe(paragraphNode);
      });
      expect(() => textNode.getParentBlockOrThrow()).toThrow();
    });

    test('OutlineNode.getParentBlockOrThrow()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read((view) => {
        const rootNode = view.getRoot();
        expect(paragraphNode.getParentBlockOrThrow()).not.toBe(paragraphNode);
        expect(paragraphNode.getParentBlockOrThrow()).toBe(rootNode);
      });
    });

    test('OutlineNode.getTopParentBlock()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(node.getTopParentBlock()).toBe(null);
      });
      await editor.getViewModel().read(() => {
        expect(textNode.getTopParentBlock()).toBe(paragraphNode);
        expect(paragraphNode.getTopParentBlock()).toBe(paragraphNode);
      });
      expect(() => textNode.getTopParentBlock()).toThrow();
    });

    test('OutlineNode.getTopParentBlockOrThrow()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(() => node.getTopParentBlockOrThrow()).toThrow();
      });
      await editor.getViewModel().read(() => {
        expect(textNode.getTopParentBlockOrThrow()).toBe(paragraphNode);
        expect(paragraphNode.getTopParentBlockOrThrow()).toBe(paragraphNode);
      });
      expect(() => textNode.getTopParentBlockOrThrow()).toThrow();
    });

    test('OutlineNode.getParents()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(node.getParents()).toEqual([]);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.getViewModel().read((view) => {
        const rootNode = view.getRoot();
        expect(textNode.getParents()).toEqual([paragraphNode, rootNode]);
        expect(paragraphNode.getParents()).toEqual([rootNode]);
      });
      expect(() => textNode.getParents()).toThrow();
    });

    test('OutlineNode.getPreviousSibling()', async () => {
      const {editor} = testEnv;
      let barTextNode;
      await editor.update(() => {
        barTextNode = new TextNode('bar');
        paragraphNode.append(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(barTextNode.getPreviousSibling()).toEqual(textNode);
        expect(textNode.getPreviousSibling()).toEqual(null);
      });
      expect(() => textNode.getPreviousSibling()).toThrow();
    });

    test('OutlineNode.getPreviousSiblings()', async () => {
      const {editor} = testEnv;
      let barTextNode;
      let bazTextNode;
      await editor.update(() => {
        barTextNode = new TextNode('bar');
        paragraphNode.append(barTextNode);
        bazTextNode = new TextNode('baz');
        paragraphNode.append(bazTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span><span>baz</span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(bazTextNode.getPreviousSiblings()).toEqual([
          textNode,
          barTextNode,
        ]);
        expect(barTextNode.getPreviousSiblings()).toEqual([textNode]);
        expect(textNode.getPreviousSiblings()).toEqual([]);
      });
      expect(() => textNode.getPreviousSiblings()).toThrow();
    });

    test('OutlineNode.getNextSibling()', async () => {
      const {editor} = testEnv;
      let barTextNode;
      await editor.update(() => {
        barTextNode = new TextNode('bar');
        paragraphNode.append(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(barTextNode.getNextSibling()).toEqual(null);
        expect(textNode.getNextSibling()).toEqual(barTextNode);
      });
      expect(() => textNode.getNextSibling()).toThrow();
    });

    test('OutlineNode.getNextSiblings()', async () => {
      const {editor} = testEnv;
      let barTextNode;
      let bazTextNode;
      await editor.update(() => {
        barTextNode = new TextNode('bar');
        paragraphNode.append(barTextNode);
        bazTextNode = new TextNode('baz');
        paragraphNode.append(bazTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span><span>baz</span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(bazTextNode.getNextSiblings()).toEqual([]);
        expect(barTextNode.getNextSiblings()).toEqual([bazTextNode]);
        expect(textNode.getNextSiblings()).toEqual([barTextNode, bazTextNode]);
      });
      expect(() => textNode.getNextSiblings()).toThrow();
    });

    test('OutlineNode.getCommonAncestor()', async () => {
      const {editor} = testEnv;
      let quxTextNode;
      let barParagraphNode;
      let barTextNode;
      let bazParagraphNode;
      let bazTextNode;
      await editor.update((view) => {
        const rootNode = view.getRoot();
        barParagraphNode = new ParagraphNode();
        barTextNode = new TextNode('bar');
        bazParagraphNode = new ParagraphNode();
        bazTextNode = new TextNode('baz');
        quxTextNode = new TextNode('qux');
        paragraphNode.append(quxTextNode);
        expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(null);
        barParagraphNode.append(barTextNode);
        bazParagraphNode.append(bazTextNode);
        expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(null);
        rootNode.append(barParagraphNode);
        rootNode.append(bazParagraphNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>qux</span></p><p><span>bar</span></p><p><span>baz</span></p></div>',
      );
      await editor.getViewModel().read((view) => {
        const rootNode = view.getRoot();
        expect(textNode.getCommonAncestor(rootNode)).toBe(null);
        expect(quxTextNode.getCommonAncestor(rootNode)).toBe(null);
        expect(barTextNode.getCommonAncestor(rootNode)).toBe(null);
        expect(bazTextNode.getCommonAncestor(rootNode)).toBe(null);
        // expect(textNode.getCommonAncestor(quxTextNode)).toBe(paragraphNode);
        expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(rootNode);
        expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(rootNode);
      });
      expect(() => textNode.getCommonAncestor(barTextNode)).toThrow();
    });

    test('OutlineNode.isBefore()', async () => {
      const {editor} = testEnv;
      let barTextNode;
      let bazTextNode;
      await editor.update(() => {
        barTextNode = new TextNode('bar');
        paragraphNode.append(barTextNode);
        bazTextNode = new TextNode('baz');
        paragraphNode.append(bazTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span><span>baz</span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(textNode.isBefore(textNode)).toBe(false);
        expect(textNode.isBefore(barTextNode)).toBe(true);
        expect(textNode.isBefore(bazTextNode)).toBe(true);
        expect(barTextNode.isBefore(bazTextNode)).toBe(true);
        expect(bazTextNode.isBefore(barTextNode)).toBe(false);
        expect(bazTextNode.isBefore(textNode)).toBe(false);
      });
      expect(() => textNode.isBefore(barTextNode)).toThrow();
    });

    test('OutlineNode.isParentOf()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read((view) => {
        const rootNode = view.getRoot();
        expect(rootNode.isParentOf(textNode)).toBe(true);
        expect(rootNode.isParentOf(paragraphNode)).toBe(true);
        expect(paragraphNode.isParentOf(textNode)).toBe(true);
        expect(paragraphNode.isParentOf(rootNode)).toBe(false);
        expect(textNode.isParentOf(paragraphNode)).toBe(false);
        expect(textNode.isParentOf(rootNode)).toBe(false);
      });
      expect(() => paragraphNode.isParentOf(textNode)).toThrow();
    });

    test('OutlineNode.getNodesBetween()', async () => {
      const {editor} = testEnv;
      let barTextNode;
      let bazTextNode;
      let newParagraphNode;
      let quxTextNode;
      await editor.update((view) => {
        const rootNode = view.getRoot();
        barTextNode = new TextNode('bar');
        paragraphNode.append(barTextNode);
        bazTextNode = new TextNode('baz');
        paragraphNode.append(bazTextNode);
        newParagraphNode = new ParagraphNode();
        quxTextNode = new TextNode('qux');
        newParagraphNode.append(quxTextNode);
        rootNode.append(newParagraphNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span><span>baz</span></p><p><span>qux</span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(textNode.getNodesBetween(textNode)).toEqual([textNode]);
        expect(textNode.getNodesBetween(barTextNode)).toEqual([
          textNode,
          barTextNode,
        ]);
        expect(textNode.getNodesBetween(bazTextNode)).toEqual([
          textNode,
          barTextNode,
          bazTextNode,
        ]);
        expect(textNode.getNodesBetween(quxTextNode)).toEqual([
          textNode,
          barTextNode,
          bazTextNode,
          paragraphNode.getLatest(),
          newParagraphNode,
          quxTextNode,
        ]);
      });
      expect(() => textNode.getNodesBetween(bazTextNode)).toThrow();
    });

    test('OutlineNode.isImmutable()', async () => {
      const {editor} = testEnv;
      let immutableTextNode;
      await editor.update(() => {
        immutableTextNode = new TextNode('immutable').makeImmutable();
        paragraphNode.append(immutableTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>immutable</span><span></span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(textNode.isImmutable(textNode)).toBe(false);
        expect(textNode.getFlags() & IS_IMMUTABLE).toBe(0);
        expect(immutableTextNode.isImmutable()).toBe(true);
        expect(immutableTextNode.getFlags() & IS_IMMUTABLE).toBe(IS_IMMUTABLE);
      });
      expect(() => textNode.isImmutable()).toThrow();
    });

    test('OutlineNode.isSegmented()', async () => {
      const {editor} = testEnv;
      let segmentedTextNode;
      await editor.update(() => {
        segmentedTextNode = new TextNode('segmented').makeSegmented();
        paragraphNode.append(segmentedTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>segmented</span><span></span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(textNode.isSegmented(textNode)).toBe(false);
        expect(textNode.getFlags() & IS_SEGMENTED).toBe(0);
        expect(segmentedTextNode.isSegmented()).toBe(true);
        expect(segmentedTextNode.getFlags() & IS_SEGMENTED).toBe(IS_SEGMENTED);
      });
      expect(() => textNode.isSegmented()).toThrow();
    });

    test('OutlineNode.isInert()', async () => {
      const {editor} = testEnv;
      let inertTextNode;
      await editor.update(() => {
        inertTextNode = new TextNode('inert').makeInert();
        paragraphNode.append(inertTextNode);
      });
      await editor.getViewModel().read(() => {
        expect(textNode.isInert(textNode)).toBe(false);
        expect(textNode.getFlags() & IS_INERT).toBe(0);
        expect(inertTextNode.isInert()).toBe(true);
        expect(inertTextNode.getFlags() & IS_INERT).toBe(IS_INERT);
      });
      expect(() => textNode.isInert()).toThrow();
    });

    test('OutlineNode.isDirectionless()', async () => {
      const {editor} = testEnv;
      let directionlessTextNode;
      await editor.update(() => {
        directionlessTextNode = new TextNode(
          'directionless',
        ).makeDirectionless();
        paragraphNode.append(directionlessTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>directionless</span></p></div>',
      );
      await editor.getViewModel().read(() => {
        expect(textNode.isDirectionless(textNode)).toBe(false);
        expect(textNode.getFlags() & IS_DIRECTIONLESS).toBe(0);
        expect(directionlessTextNode.isDirectionless()).toBe(true);
        expect(directionlessTextNode.getFlags() & IS_DIRECTIONLESS).toBe(
          IS_DIRECTIONLESS,
        );
      });
      expect(() => textNode.isDirectionless()).toThrow();
    });

    test('OutlineNode.getLatest()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(textNode.getLatest()).toBe(textNode);
      });
      expect(() => textNode.getLatest()).toThrow();
    });

    test('OutlineNode.getLatest(): garbage collected node', async () => {
      const {editor} = testEnv;
      let node;
      await editor.update(() => {
        node = new OutlineNode();
        node.getLatest();
      });
      await editor.update(() => {
        expect(() => node.getLatest()).toThrow();
      });
    });

    test('OutlineNode.getTextContent()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(node.getTextContent()).toBe('');
      });
      await editor.getViewModel().read(() => {
        expect(textNode.getTextContent()).toBe('foo');
      });
      expect(() => textNode.getTextContent()).toThrow();
    });

    test('OutlineNode.getTextContentSize()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(textNode.getTextContentSize()).toBe('foo'.length);
        // TODO: more tests with inert and directionless children
      });
      expect(() => textNode.getTextContentSize()).toThrow();
    });

    test('OutlineNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(() => node.createDOM()).toThrow();
      });
    });

    test('OutlineNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = new OutlineNode();
        expect(() => node.updateDOM()).toThrow();
      });
    });

    test('OutlineNode.setFlags()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.setFlags(IS_SEGMENTED)).toThrow();
      });
      await editor.update(() => {
        expect(textNode.getFlags()).toBe(0);
        textNode.setFlags(IS_SEGMENTED);
        expect(textNode.getFlags()).toBe(IS_SEGMENTED);
        textNode.setFlags(IS_INERT);
        expect(textNode.getFlags()).toBe(IS_INERT);
        textNode.setFlags(0);
        expect(textNode.getFlags()).toBe(0);
        textNode.setFlags(IS_IMMUTABLE);
        expect(textNode.getFlags()).toBe(IS_IMMUTABLE);
        expect(() => textNode.setFlags(IS_SEGMENTED)).toThrow();
        expect(textNode.getFlags()).toBe(IS_IMMUTABLE);
      });
      expect(() => textNode.setFlags()).toThrow();
    });

    test('OutlineNode.makeImmutable()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.makeImmutable()).toThrow();
      });
      await editor.update(() => {
        textNode.makeImmutable();
        expect(textNode.getFlags() & IS_IMMUTABLE).toBe(IS_IMMUTABLE);
      });
      expect(() => textNode.makeImmutable()).toThrow();
    });

    test('OutlineNode.makeSegmented()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.makeSegmented()).toThrow();
      });
      await editor.update(() => {
        textNode.makeSegmented();
        expect(textNode.getFlags() & IS_SEGMENTED).toBe(IS_SEGMENTED);
      });
      expect(() => textNode.makeSegmented()).toThrow();
    });

    test('OutlineNode.makeInert()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.makeInert()).toThrow();
      });
      await editor.update(() => {
        textNode.makeInert();
        expect(textNode.getFlags() & IS_INERT).toBe(IS_INERT);
      });
      expect(() => textNode.makeInert()).toThrow();
    });

    test('OutlineNode.makeDirectionless()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.makeDirectionless()).toThrow();
      });
      await editor.update(() => {
        textNode.makeDirectionless();
        expect(textNode.getFlags() & IS_DIRECTIONLESS).toBe(IS_DIRECTIONLESS);
      });
      expect(() => textNode.makeDirectionless()).toThrow();
    });

    test('OutlineNode.remove()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.remove()).toThrow();
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const node = new OutlineNode();
        node.remove();
        expect(node.getParent()).toBe(null);
        textNode.remove();
        expect(textNode.getParent()).toBe(null);
        expect(editor.getViewModel()._dirtyNodes.has(textNode.getKey()));
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p></p></div>',
      );
      expect(() => textNode.remove()).toThrow();
    });

    test('OutlineNode.replace()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.replace()).toThrow();
      });
      expect(() => textNode.remove()).toThrow();
    });

    test('OutlineNode.replace(): from another parent', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      let barTextNode;
      await editor.update((view) => {
        const rootNode = view.getRoot();
        const barParagraphNode = new ParagraphNode();
        barTextNode = new TextNode('bar');
        barParagraphNode.append(barTextNode);
        rootNode.append(barParagraphNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p><p><span>bar</span></p></div>',
      );
      await editor.update(() => {
        textNode.replace(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>bar</span></p><p></p></div>',
      );
    });

    test('OutlineNode.replace(): text', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar');
        textNode.replace(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>bar</span></p></div>',
      );
    });

    test('OutlineNode.replace(): immutable', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeImmutable();
        textNode.replace(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span><span>bar</span><span></span></p></div>',
      );
    });

    test('OutlineNode.replace(): inert', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeInert();
        textNode.replace(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span><span style="pointer-events: none; user-select: none;">bar</span><span></span></p></div>',
      );
    });

    test('OutlineNode.replace(): segmented', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeSegmented();
        textNode.replace(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span><span>bar</span><span></span></p></div>',
      );
    });

    test('OutlineNode.replace(): directionless', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode(`bar`).makeDirectionless();
        textNode.replace(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>bar</span></p></div>',
      );
      // TODO: add text direction validations
    });

    test('OutlineNode.insertAfter()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.insertAfter()).toThrow();
      });
      expect(() => textNode.insertAfter()).toThrow();
    });

    test('OutlineNode.insertAfter(): text', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar');
        textNode.insertAfter(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span></p></div>',
      );
    });

    test('OutlineNode.insertAfter(): immutable', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeImmutable();
        textNode.insertAfter(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span><span></span></p></div>',
      );
    });

    test('OutlineNode.insertAfter(): segmented', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeSegmented();
        textNode.insertAfter(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span><span></span></p></div>',
      );
    });

    test('OutlineNode.insertAfter(): inert', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeInert();
        textNode.insertAfter(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span style="pointer-events: none; user-select: none;">bar</span><span></span></p></div>',
      );
    });

    test('OutlineNode.insertAfter(): directionless', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode(`bar`).makeDirectionless();
        textNode.insertAfter(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span><span>bar</span></p></div>',
      );
      // TODO: add text direction validations
    });

    test('OutlineNode.insertBefore()', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(() => textNode.insertBefore()).toThrow();
      });
      expect(() => textNode.insertBefore()).toThrow();
    });

    test('OutlineNode.insertBefore(): from another parent', async () => {
      const {editor} = testEnv;

      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );

      let barTextNode;
      await editor.update((view) => {
        const rootNode = view.getRoot();
        const barParagraphNode = new ParagraphNode();
        barTextNode = new TextNode('bar');
        barParagraphNode.append(barTextNode);
        rootNode.append(barParagraphNode);
      });

      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p><p><span>bar</span></p></div>',
      );
    });

    test('OutlineNode.insertBefore(): text', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar');
        textNode.insertBefore(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>bar</span><span>foo</span></p></div>',
      );
    });

    test('OutlineNode.insertBefore(): immutable', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeImmutable();
        textNode.insertBefore(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span><span>bar</span><span>foo</span></p></div>',
      );
    });

    test('OutlineNode.insertBefore(): segmented', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeSegmented();
        textNode.insertBefore(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span><span>bar</span><span>foo</span></p></div>',
      );
    });

    test('OutlineNode.insertBefore(): inert', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeInert();
        textNode.insertBefore(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span><span style="pointer-events: none; user-select: none;">bar</span><span>foo</span></p></div>',
      );
    });

    test('OutlineNode.insertBefore(): directionless', async () => {
      const {editor} = testEnv;
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>foo</span></p></div>',
      );
      await editor.update(() => {
        const barTextNode = new TextNode(`bar`).makeDirectionless();
        textNode.insertBefore(barTextNode);
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span>bar</span><span>foo</span></p></div>',
      );
      // TODO: add text direction validations
    });

    test('OutlineNode.selectNext()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const barTextNode = new TextNode('bar');
        textNode.insertAfter(barTextNode);
        expect(barTextNode.isSelected()).not.toBe(true);
        textNode.selectNext();
        expect(barTextNode.isSelected()).toBe(true);
        // TODO: additional validation of anchorOffset and focusOffset
      });
    });

    test('OutlineNode.selectNext(): no next sibling', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        expect(() => textNode.selectNext()).toThrow();
      });
    });

    test('OutlineNode.selectNext(): immutable', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeImmutable();
        textNode.insertAfter(barTextNode);
        expect(() => textNode.selectNext()).toThrow();
      });
    });

    test('OutlineNode.selectNext(): segmented', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const barTextNode = new TextNode('bar').makeSegmented();
        textNode.insertAfter(barTextNode);
        expect(() => textNode.selectNext()).toThrow();
      });
    });

    test('getNodeByKey', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(getNodeByKey('_1')).toBe(paragraphNode);
        expect(getNodeByKey('_2')).toBe(textNode);
        expect(getNodeByKey('_0')).toBe(null);
      });
      expect(() => getNodeByKey()).toThrow();
    });
  });
});
