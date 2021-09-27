/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {View} from 'outline';

import {createEditor, createTextNode, TextNode, BlockNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import {
  insertText,
  insertNodes,
  insertParagraph,
  insertLineBreak,
  formatText,
  extractSelection,
  getNodesInRange,
} from 'outline/SelectionHelpers';
import {createTestBlockNode} from '../../../__tests__/utils';

export class ExcludeFromCopyBlockNode extends BlockNode {
  static clone(node: BlockNode) {
    return new ExcludeFromCopyBlockNode(node.__key);
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
  excludeFromCopy() {
    return true;
  }
}

export function createExcludeFromCopyBlockNode(): ExcludeFromCopyBlockNode {
  return new ExcludeFromCopyBlockNode();
}

function createParagraphWithNodes(editor, nodes) {
  const paragraph = createParagraphNode();
  const nodeMap = editor._pendingViewModel._nodeMap;
  for (let i = 0; i < nodes.length; i++) {
    const {text, key, mergeable} = nodes[i];
    const textNode = new TextNode(text, key);
    nodeMap.set(key, textNode);
    if (!mergeable) {
      textNode.toggleUnmergeable();
    }
    paragraph.append(textNode);
  }
  return paragraph;
}

function setAnchorPoint(view, point) {
  let selection = view.getSelection();
  if (selection === null) {
    const dummyTextNode = createTextNode();
    dummyTextNode.select();
    selection = view.getSelection();
  }
  const anchor = selection.anchor;
  anchor.type = point.type;
  anchor.offset = point.offset;
  anchor.key = point.key;
}

function setFocusPoint(view, point) {
  let selection = view.getSelection();
  if (selection === null) {
    const dummyTextNode = createTextNode();
    dummyTextNode.select();
    selection = view.getSelection();
  }
  const focus = selection.focus;
  focus.type = point.type;
  focus.offset = point.offset;
  focus.key = point.key;
}

describe('OutlineSelectionHelpers tests', () => {
  describe('Collapsed', () => {
    test('Can handle a text point', () => {
      const setupTestCase = (cb) => {
        const editor = createEditor({});

        editor.addListener('error', (error) => {
          throw error;
        });

        editor.update((view) => {
          const root = view.getRoot();
          const block = createParagraphWithNodes(editor, [
            {text: 'a', key: 'a', mergeable: false},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: false},
          ]);
          root.append(block);
          setAnchorPoint(view, {
            type: 'text',
            offset: 0,
            key: 'a',
          });
          setFocusPoint(view, {
            type: 'text',
            offset: 0,
            key: 'a',
          });

          const selection = view.getSelection();
          cb(selection, view, block);
        });
      };

      // getNodes
      setupTestCase((selection, view) => {
        expect(selection.getNodes()).toEqual([view.getNodeByKey('a')]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('');
      });

      // insertText
      setupTestCase((selection, view) => {
        insertText(selection, 'Test');
        expect(view.getNodeByKey('a').getTextContent()).toBe('Testa');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: 'a',
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: 'a',
        });
      });

      // insertNodes
      setupTestCase((selection, view, block) => {
        insertNodes(selection, [createTextNode('foo')]);
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 3,
          key: block.getFirstChild().getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 3,
          key: block.getFirstChild().getKey(),
        });
      });

      // insertParagraph
      setupTestCase((selection) => {
        insertParagraph(selection);
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 0,
          key: 'a',
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 0,
          key: 'a',
        });
      });

      // insertLineBreak
      setupTestCase((selection, view, block) => {
        insertLineBreak(selection, true);
        expect(selection.anchor).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
      });

      // Format text
      setupTestCase((selection, view, block) => {
        formatText(selection, 'bold');
        insertText(selection, 'Test');
        expect(block.getFirstChild().getNextSibling().getTextContent()).toBe(
          'Test',
        );
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: block.getFirstChild().getNextSibling().getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: block.getFirstChild().getNextSibling().getKey(),
        });
      });

      // Extract selection
      setupTestCase((selection, view) => {
        expect(extractSelection(selection)).toEqual([view.getNodeByKey('a')]);
      });

      // getNodesInRange
      setupTestCase((selection, view, block) => {
        expect(getNodesInRange(selection)).toEqual({
          range: ['a'],
          nodeMap: [['a', {...view.getNodeByKey('a'), __text: ''}]],
        });
      });
    });

    test('Has correct text point adjust to block point after removal of a single empty text node', async () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      const element = document.createElement('div');
      let block;

      editor.setRootElement(element);

      editor.update((view) => {
        const root = view.getRoot();
        block = createParagraphWithNodes(
          editor,
          [{text: '', key: 'a', mergeable: true}],
          true,
        );
        root.append(block);
        setAnchorPoint(view, {
          type: 'text',
          key: 'a',
          offset: 0,
        });
        setFocusPoint(view, {
          type: 'text',
          key: 'a',
          offset: 0,
        });
      });

      await Promise.resolve().then();

      editor.getViewModel().read((view) => {
        const selection = view.getSelection();
        expect(selection.anchor).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 0,
        });
        expect(selection.focus).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 0,
        });
      });
    });

    test('Has correct block point after removal of an empty text node in a group #1', async () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      const element = document.createElement('div');
      let block;

      editor.setRootElement(element);

      editor.update((view) => {
        const root = view.getRoot();
        block = createParagraphWithNodes(
          editor,
          [
            {text: '', key: 'a', mergeable: true},
            {text: 'b', key: 'b', mergeable: false},
          ],
          true,
        );
        root.append(block);
        setAnchorPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 2,
        });
        setFocusPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 2,
        });
      });

      await Promise.resolve().then();

      editor.getViewModel().read((view) => {
        const selection = view.getSelection();
        expect(selection.anchor).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 1,
        });
        expect(selection.focus).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 1,
        });
      });
    });

    test('Has correct block point after removal of an empty text node in a group #2', async () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      const element = document.createElement('div');
      let block;

      editor.setRootElement(element);

      editor.update((view) => {
        const root = view.getRoot();
        block = createParagraphWithNodes(
          editor,
          [
            {text: '', key: 'a', mergeable: true},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: true},
            {text: 'd', key: 'd', mergeable: true},
          ],
          true,
        );
        root.append(block);
        setAnchorPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 4,
        });
        setFocusPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 4,
        });
      });

      await Promise.resolve().then();

      editor.getViewModel().read((view) => {
        const selection = view.getSelection();
        expect(selection.anchor).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 2,
        });
        expect(selection.focus).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 2,
        });
      });
    });

    test('Has correct text point after removal of an empty text node in a group #3', async () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      const element = document.createElement('div');
      let block;

      editor.setRootElement(element);

      editor.update((view) => {
        const root = view.getRoot();
        block = createParagraphWithNodes(
          editor,
          [
            {text: '', key: 'a', mergeable: true},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: true},
            {text: 'd', key: 'd', mergeable: true},
          ],
          true,
        );
        root.append(block);
        setAnchorPoint(view, {
          type: 'text',
          key: 'd',
          offset: 1,
        });
        setFocusPoint(view, {
          type: 'text',
          key: 'd',
          offset: 1,
        });
      });

      await Promise.resolve().then();

      editor.getViewModel().read((view) => {
        const selection = view.getSelection();
        expect(selection.anchor).toEqual({
          type: 'text',
          key: 'c',
          offset: 2,
        });
        expect(selection.focus).toEqual({
          type: 'text',
          key: 'c',
          offset: 2,
        });
      });
    });

    test('Can handle a start block point', () => {
      const setupTestCase = (cb) => {
        const editor = createEditor({});

        editor.addListener('error', (error) => {
          throw error;
        });

        editor.update((view) => {
          const root = view.getRoot();
          const block = createParagraphWithNodes(editor, [
            {text: 'a', key: 'a', mergeable: false},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: false},
          ]);
          root.append(block);
          setAnchorPoint(view, {
            type: 'block',
            offset: 0,
            key: block.getKey(),
          });
          setFocusPoint(view, {
            type: 'block',
            offset: 0,
            key: block.getKey(),
          });

          const selection = view.getSelection();
          cb(selection, view, block);
        });
      };

      // getNodes
      setupTestCase((selection, view) => {
        expect(selection.getNodes()).toEqual([view.getNodeByKey('a')]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('');
      });

      // insertText
      setupTestCase((selection, view, block) => {
        insertText(selection, 'Test');
        const firstChild = block.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
      });

      // insertParagraph
      setupTestCase((selection, view, block) => {
        insertParagraph(selection);
        const firstChild = block.getNextSibling().getFirstChild();
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 0,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 0,
          key: firstChild.getKey(),
        });
      });

      // insertLineBreak
      setupTestCase((selection, view, block) => {
        insertLineBreak(selection, true);
        expect(selection.anchor).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
      });

      // Format text
      setupTestCase((selection, view, block) => {
        formatText(selection, 'bold');
        insertText(selection, 'Test');
        const firstChild = block.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
      });

      // Extract selection
      setupTestCase((selection, view, block) => {
        expect(extractSelection(selection)).toEqual([view.getNodeByKey('a')]);
      });

      // getNodesInRange
      setupTestCase((selection, view, block) => {
        expect(getNodesInRange(selection)).toEqual({
          range: ['a'],
          nodeMap: [['a', {...view.getNodeByKey('a'), __text: ''}]],
        });
      });
    });

    test('Can handle an end block point', () => {
      const setupTestCase = (cb) => {
        const editor = createEditor({});

        editor.addListener('error', (error) => {
          throw error;
        });

        editor.update((view) => {
          const root = view.getRoot();
          const block = createParagraphWithNodes(editor, [
            {text: 'a', key: 'a', mergeable: false},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: false},
          ]);
          root.append(block);
          setAnchorPoint(view, {
            type: 'block',
            offset: 3,
            key: block.getKey(),
          });
          setFocusPoint(view, {
            type: 'block',
            offset: 3,
            key: block.getKey(),
          });

          const selection = view.getSelection();
          cb(selection, view, block);
        });
      };

      // getNodes
      setupTestCase((selection, view) => {
        expect(selection.getNodes()).toEqual([view.getNodeByKey('c')]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('');
      });

      // insertText
      setupTestCase((selection, view, block) => {
        insertText(selection, 'Test');
        const lastChild = block.getLastChild();
        expect(lastChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: lastChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: lastChild.getKey(),
        });
      });

      // insertParagraph
      setupTestCase((selection, view, block) => {
        insertParagraph(selection);
        const nextSibling = block.getNextSibling();
        expect(selection.anchor).toEqual({
          type: 'block',
          offset: 0,
          key: nextSibling.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'block',
          offset: 0,
          key: nextSibling.getKey(),
        });
      });

      // insertLineBreak
      setupTestCase((selection, view, block) => {
        insertLineBreak(selection, true);
        const thirdChild = view.getNodeByKey('c');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 1,
          key: thirdChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 1,
          key: thirdChild.getKey(),
        });
      });

      // Format text
      setupTestCase((selection, view, block) => {
        formatText(selection, 'bold');
        insertText(selection, 'Test');
        const lastChild = block.getLastChild();
        expect(lastChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: lastChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: lastChild.getKey(),
        });
      });

      // Extract selection
      setupTestCase((selection, view, block) => {
        expect(extractSelection(selection)).toEqual([view.getNodeByKey('c')]);
      });

      // getNodesInRange
      setupTestCase((selection, view, block) => {
        expect(getNodesInRange(selection)).toEqual({
          range: ['c'],
          nodeMap: [['c', {...view.getNodeByKey('c'), __text: ''}]],
        });
      });
    });

    test('Has correct block point after merge from middle', async () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      const element = document.createElement('div');
      let block;

      editor.setRootElement(element);

      editor.update((view) => {
        const root = view.getRoot();
        block = createParagraphWithNodes(editor, [
          {text: 'a', key: 'a', mergeable: true},
          {text: 'b', key: 'b', mergeable: true},
          {text: 'c', key: 'c', mergeable: true},
        ]);
        root.append(block);
        setAnchorPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 2,
        });
        setFocusPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 2,
        });
      });

      await Promise.resolve().then();

      editor.getViewModel().read((view) => {
        const selection = view.getSelection();
        expect(selection.anchor).toEqual({
          type: 'text',
          key: 'a',
          offset: 2,
        });
        expect(selection.focus).toEqual({
          type: 'text',
          key: 'a',
          offset: 2,
        });
      });
    });

    test('Has correct block point after merge from end', async () => {
      const editor = createEditor({});

      editor.addListener('error', (error) => {
        throw error;
      });

      const element = document.createElement('div');
      let block;

      editor.setRootElement(element);

      editor.update((view) => {
        const root = view.getRoot();
        block = createParagraphWithNodes(editor, [
          {text: 'a', key: 'a', mergeable: true},
          {text: 'b', key: 'b', mergeable: true},
          {text: 'c', key: 'c', mergeable: true},
        ]);
        root.append(block);
        setAnchorPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 3,
        });
        setFocusPoint(view, {
          type: 'block',
          key: block.getKey(),
          offset: 3,
        });
      });

      await Promise.resolve().then();

      editor.getViewModel().read((view) => {
        const selection = view.getSelection();
        expect(selection.anchor).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 1,
        });
        expect(selection.focus).toEqual({
          type: 'block',
          key: block.getKey(),
          offset: 1,
        });
      });
    });
  });

  describe('Simple range', () => {
    test('Can handle multiple text points', () => {
      const setupTestCase = (cb) => {
        const editor = createEditor({});

        editor.addListener('error', (error) => {
          throw error;
        });

        editor.update((view) => {
          const root = view.getRoot();
          const block = createParagraphWithNodes(editor, [
            {text: 'a', key: 'a', mergeable: false},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: false},
          ]);
          root.append(block);
          setAnchorPoint(view, {
            type: 'text',
            offset: 0,
            key: 'a',
          });
          setFocusPoint(view, {
            type: 'text',
            offset: 0,
            key: 'b',
          });

          const selection = view.getSelection();
          cb(selection, view, block);
        });
      };

      // getNodes
      setupTestCase((selection, view) => {
        expect(selection.getNodes()).toEqual([
          view.getNodeByKey('a'),
          view.getNodeByKey('b'),
        ]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('a');
      });

      // insertText
      setupTestCase((selection, view) => {
        insertText(selection, 'Test');
        expect(view.getNodeByKey('a').getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: 'a',
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: 'a',
        });
      });

      // insertNodes
      setupTestCase((selection, view, block) => {
        insertNodes(selection, [createTextNode('foo')]);
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 3,
          key: block.getFirstChild().getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 3,
          key: block.getFirstChild().getKey(),
        });
      });

      // insertParagraph
      setupTestCase((selection) => {
        insertParagraph(selection);
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 0,
          key: 'b',
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 0,
          key: 'b',
        });
      });

      // insertLineBreak
      setupTestCase((selection, view, block) => {
        insertLineBreak(selection, true);
        expect(selection.anchor).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
      });

      // Format text
      setupTestCase((selection, view, block) => {
        formatText(selection, 'bold');
        insertText(selection, 'Test');
        expect(block.getFirstChild().getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: block.getFirstChild().getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: block.getFirstChild().getKey(),
        });
      });

      // Extract selection
      setupTestCase((selection, view) => {
        expect(extractSelection(selection)).toEqual([
          {...view.getNodeByKey('a')},
          {...view.getNodeByKey('b')},
        ]);
      });

      // getNodesInRange
      setupTestCase((selection, view, block) => {
        expect(getNodesInRange(selection)).toEqual({
          range: ['a', 'b'],
          nodeMap: [
            ['a', view.getNodeByKey('a')],
            ['b', {...view.getNodeByKey('b'), __text: ''}],
          ],
        });
      });
    });

    test('Can handle multiple block points', () => {
      const setupTestCase = (cb) => {
        const editor = createEditor({});

        editor.addListener('error', (error) => {
          throw error;
        });

        editor.update((view) => {
          const root = view.getRoot();
          const block = createParagraphWithNodes(editor, [
            {text: 'a', key: 'a', mergeable: false},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: false},
          ]);
          root.append(block);
          setAnchorPoint(view, {
            type: 'block',
            offset: 0,
            key: block.getKey(),
          });
          setFocusPoint(view, {
            type: 'block',
            offset: 1,
            key: block.getKey(),
          });

          const selection = view.getSelection();
          cb(selection, view, block);
        });
      };

      // getNodes
      setupTestCase((selection, view) => {
        expect(selection.getNodes()).toEqual([
          view.getNodeByKey('a'),
          view.getNodeByKey('b'),
        ]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('a');
      });

      // insertText
      setupTestCase((selection, view, block) => {
        insertText(selection, 'Test');
        const firstChild = block.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
      });

      // insertParagraph
      setupTestCase((selection, view, block) => {
        insertParagraph(selection);
        const firstChild = block.getNextSibling().getFirstChild();
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 0,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 0,
          key: firstChild.getKey(),
        });
      });

      // insertLineBreak
      setupTestCase((selection, view, block) => {
        insertLineBreak(selection, true);
        expect(selection.anchor).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
      });

      // Format text
      setupTestCase((selection, view, block) => {
        formatText(selection, 'bold');
        insertText(selection, 'Test');
        const firstChild = block.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
      });

      // Extract selection
      setupTestCase((selection, view, block) => {
        const firstChild = block.getFirstChild();
        expect(extractSelection(selection)).toEqual([
          firstChild,
          firstChild.getNextSibling(),
        ]);
      });

      // getNodesInRange
      setupTestCase((selection, view, block) => {
        expect(getNodesInRange(selection)).toEqual({
          range: ['a', 'b'],
          nodeMap: [
            ['a', view.getNodeByKey('a')],
            ['b', {...view.getNodeByKey('b'), __text: ''}],
          ],
        });
      });
    });

    test('Can handle a mix of text and block points', () => {
      const setupTestCase = (cb) => {
        const editor = createEditor({});

        editor.addListener('error', (error) => {
          throw error;
        });

        editor.update((view) => {
          const root = view.getRoot();
          const block = createParagraphWithNodes(editor, [
            {text: 'a', key: 'a', mergeable: false},
            {text: 'b', key: 'b', mergeable: false},
            {text: 'c', key: 'c', mergeable: false},
          ]);
          root.append(block);
          setAnchorPoint(view, {
            type: 'block',
            offset: 0,
            key: block.getKey(),
          });
          setFocusPoint(view, {
            type: 'text',
            offset: 1,
            key: 'c',
          });

          const selection = view.getSelection();
          cb(selection, view, block);
        });
      };

      // getNodes
      setupTestCase((selection, view) => {
        expect(selection.getNodes()).toEqual([
          view.getNodeByKey('a'),
          view.getNodeByKey('b'),
          view.getNodeByKey('c'),
        ]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('abc');
      });

      // insertText
      setupTestCase((selection, view, block) => {
        insertText(selection, 'Test');
        const firstChild = block.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
      });

      // insertParagraph
      setupTestCase((selection, view, block) => {
        insertParagraph(selection);
        const nextBlock = block.getNextSibling();
        expect(selection.anchor).toEqual({
          type: 'block',
          offset: 0,
          key: nextBlock.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'block',
          offset: 0,
          key: nextBlock.getKey(),
        });
      });

      // insertLineBreak
      setupTestCase((selection, view, block) => {
        insertLineBreak(selection, true);
        expect(selection.anchor).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'block',
          offset: 0,
          key: block.getKey(),
        });
      });

      // Format text
      setupTestCase((selection, view, block) => {
        formatText(selection, 'bold');
        insertText(selection, 'Test');
        const firstChild = block.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
        expect(selection.focus).toEqual({
          type: 'text',
          offset: 4,
          key: firstChild.getKey(),
        });
      });

      // Extract selection
      setupTestCase((selection, view, block) => {
        expect(extractSelection(selection)).toEqual([
          view.getNodeByKey('a'),
          view.getNodeByKey('b'),
          view.getNodeByKey('c'),
        ]);
      });

      // getNodesInRange
      setupTestCase((selection, view, block) => {
        expect(getNodesInRange(selection)).toEqual({
          range: ['a', 'b', 'c'],
          nodeMap: [
            ['a', view.getNodeByKey('a')],
            ['b', view.getNodeByKey('b')],
            ['c', view.getNodeByKey('c')],
          ],
        });
      });
    });
  });

  test('range with excludeFromCopy nodes', async () => {
    const editor = createEditor({});

    editor.addListener('error', (error) => {
      throw error;
    });

    const element = document.createElement('div');

    editor.setRootElement(element);

    await editor.update((view: View) => {
      const root = view.getRoot();
      const paragraph = createParagraphNode();
      root.append(paragraph);

      const excludeBlockNode1 = createExcludeFromCopyBlockNode();
      paragraph.append(excludeBlockNode1);
      paragraph.select(0, 0);
      const selectedNodes1 = getNodesInRange(view.getSelection());
      expect(selectedNodes1.range).toEqual([]);

      const text1 = createTextNode('1');
      excludeBlockNode1.append(text1);
      excludeBlockNode1.select(0, 0);
      const selectedNodes2 = getNodesInRange(view.getSelection());
      expect(selectedNodes2.range).toEqual([text1.getKey()]);

      paragraph.select(0, 0);
      const selectedNodes3 = getNodesInRange(view.getSelection());
      expect(selectedNodes3.range).toEqual([text1.getKey()]);

      const text2 = createTextNode('2');
      excludeBlockNode1.insertAfter(text2);
      paragraph.select(0, 2);
      const selectedNodes4 = getNodesInRange(view.getSelection());
      expect(selectedNodes4.range).toEqual([text1.getKey(), text2.getKey()]);
      expect(selectedNodes4.nodeMap[0][0]).toEqual(text1.getKey());
      expect(selectedNodes4.nodeMap[1][0]).toEqual(text2.getKey());

      const text3 = createTextNode('3');
      excludeBlockNode1.append(text3);
      paragraph.select(0, 2);
      const selectedNodes5 = getNodesInRange(view.getSelection());
      expect(selectedNodes5.range).toEqual([
        text1.getKey(),
        text3.getKey(),
        text2.getKey(),
      ]);
      expect(selectedNodes5.nodeMap[0][0]).toEqual(text1.getKey());
      expect(selectedNodes5.nodeMap[1][0]).toEqual(text3.getKey());
      expect(selectedNodes5.nodeMap[2][0]).toEqual(text2.getKey());

      const testBlockNode = createTestBlockNode();
      const excludeBlockNode2 = createExcludeFromCopyBlockNode();
      const text4 = createTextNode('4');
      text1.insertBefore(testBlockNode);
      testBlockNode.append(excludeBlockNode2);
      excludeBlockNode2.append(text4);
      paragraph.select(0, 3);
      const selectedNodes6 = getNodesInRange(view.getSelection());
      expect(selectedNodes6.range).toEqual([
        text4.getKey(),
        text1.getKey(),
        text3.getKey(),
        text2.getKey(),
      ]);
      expect(selectedNodes6.nodeMap[0][0]).toEqual(text4.getKey());
      expect(selectedNodes6.nodeMap[1][0]).toEqual(text1.getKey());
      expect(selectedNodes6.nodeMap[2][0]).toEqual(text3.getKey());
      expect(selectedNodes6.nodeMap[3][0]).toEqual(text2.getKey());

      text4.remove();
      paragraph.select(0, 3);
      const selectedNodes7 = getNodesInRange(view.getSelection());
      expect(selectedNodes7.range).toEqual([
        text1.getKey(),
        text3.getKey(),
        text2.getKey(),
      ]);
      expect(selectedNodes7.nodeMap[0][0]).toEqual(text1.getKey());
      expect(selectedNodes7.nodeMap[1][0]).toEqual(text3.getKey());
      expect(selectedNodes7.nodeMap[2][0]).toEqual(text2.getKey());
    });
  });
});
