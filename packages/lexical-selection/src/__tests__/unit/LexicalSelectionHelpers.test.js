/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {State} from 'lexical';

import {$createLinkNode} from '@lexical/link';
import {$createHeadingNode} from '@lexical/rich-text';
import {$cloneContents} from '@lexical/selection';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  TextNode,
} from 'lexical';
import {
  $createTestElementNode,
  $createTestExcludeFromCopyElementNode,
  createTestEditor,
} from 'lexical/src/__tests__/utils';

import {setAnchorPoint, setFocusPoint} from '../utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

function createParagraphWithNodes(editor, nodes) {
  const paragraph = $createParagraphNode();
  const nodeMap = editor._pendingEditorState._nodeMap;
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

describe('LexicalSelectionHelpers tests', () => {
  describe('Collapsed', () => {
    test('Can handle a text point', () => {
      const setupTestCase = (cb) => {
        const editor = createTestEditor();

        editor.update(() => {
          const root = $getRoot();
          const element = createParagraphWithNodes(editor, [
            {key: 'a', mergeable: false, text: 'a'},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: false, text: 'c'},
          ]);
          root.append(element);
          setAnchorPoint({
            key: 'a',
            offset: 0,
            type: 'text',
          });
          setFocusPoint({
            key: 'a',
            offset: 0,
            type: 'text',
          });

          const selection = $getSelection();
          cb(selection, element);
        });
      };

      // getNodes
      setupTestCase((selection, state) => {
        expect(selection.getNodes()).toEqual([$getNodeByKey('a')]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('');
      });

      // insertText
      setupTestCase((selection, state) => {
        selection.insertText('Test');
        expect($getNodeByKey('a').getTextContent()).toBe('Testa');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 4,
            type: 'text',
          }),
        );
      });

      // insertNodes
      setupTestCase((selection, element) => {
        selection.insertNodes([$createTextNode('foo')]);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 3,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 3,
            type: 'text',
          }),
        );
      });

      // insertParagraph
      setupTestCase((selection) => {
        selection.insertParagraph();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 0,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 0,
            type: 'text',
          }),
        );
      });

      // insertLineBreak
      setupTestCase((selection, element) => {
        selection.insertLineBreak(true);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // Format text
      setupTestCase((selection, element) => {
        selection.formatText('bold');
        selection.insertText('Test');
        expect(element.getFirstChild().getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(element.getFirstChild().getNextSibling().getTextContent()).toBe(
          'a',
        );
      });

      // Extract selection
      setupTestCase((selection, state) => {
        expect(selection.extract()).toEqual([$getNodeByKey('a')]);
      });

      // cloneContents
      setupTestCase((selection, element) => {
        expect($cloneContents(selection)).toEqual({
          nodeMap: [
            ['a', {...$getNodeByKey('a'), __text: ''}],
            [element.getKey(), {...element, __children: ['a']}],
          ],
          range: [element.getKey()],
        });
      });
    });

    test('Has correct text point after removal after merge', async () => {
      const editor = createTestEditor();

      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(
          editor,
          [
            {key: 'a', mergeable: true, text: 'a'},
            {key: 'bb', mergeable: true, text: 'bb'},
            {key: 'empty', mergeable: true, text: ''},
            {key: 'cc', mergeable: true, text: 'cc'},
            {key: 'd', mergeable: true, text: 'd'},
          ],
          true,
        );
        root.append(element);
        setAnchorPoint({
          key: 'bb',
          offset: 1,
          type: 'text',
        });
        setFocusPoint({
          key: 'cc',
          offset: 1,
          type: 'text',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 2,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 4,
            type: 'text',
          }),
        );
      });
    });

    test('Has correct text point after removal after merge (2)', async () => {
      const editor = createTestEditor();
      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(
          editor,
          [
            {key: 'a', mergeable: true, text: 'a'},
            {key: 'empty', mergeable: true, text: ''},
            {key: 'b', mergeable: true, text: 'b'},
            {key: 'c', mergeable: true, text: 'c'},
          ],
          true,
        );
        root.append(element);
        setAnchorPoint({
          key: 'a',
          offset: 0,
          type: 'text',
        });
        setFocusPoint({
          key: 'c',
          offset: 1,
          type: 'text',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 0,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 3,
            type: 'text',
          }),
        );
      });
    });

    test('Has correct text point adjust to element point after removal of a single empty text node', async () => {
      const editor = createTestEditor();
      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(
          editor,
          [{key: 'a', mergeable: true, text: ''}],
          true,
        );
        root.append(element);
        setAnchorPoint({
          key: 'a',
          offset: 0,
          type: 'text',
        });
        setFocusPoint({
          key: 'a',
          offset: 0,
          type: 'text',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });
    });

    test('Has correct element point after removal of an empty text node in a group #1', async () => {
      const editor = createTestEditor();
      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(
          editor,
          [
            {key: 'a', mergeable: true, text: ''},
            {key: 'b', mergeable: false, text: 'b'},
          ],
          true,
        );
        root.append(element);
        setAnchorPoint({
          key: element.getKey(),
          offset: 2,
          type: 'element',
        });
        setFocusPoint({
          key: element.getKey(),
          offset: 2,
          type: 'element',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'b',
            offset: 1,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'b',
            offset: 1,
            type: 'text',
          }),
        );
      });
    });

    test('Has correct element point after removal of an empty text node in a group #2', async () => {
      const editor = createTestEditor();
      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(
          editor,
          [
            {key: 'a', mergeable: true, text: ''},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: true, text: 'c'},
            {key: 'd', mergeable: true, text: 'd'},
          ],
          true,
        );
        root.append(element);
        setAnchorPoint({
          key: element.getKey(),
          offset: 4,
          type: 'element',
        });
        setFocusPoint({
          key: element.getKey(),
          offset: 4,
          type: 'element',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'c',
            offset: 2,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'c',
            offset: 2,
            type: 'text',
          }),
        );
      });
    });

    test('Has correct text point after removal of an empty text node in a group #3', async () => {
      const editor = createTestEditor();
      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(
          editor,
          [
            {key: 'a', mergeable: true, text: ''},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: true, text: 'c'},
            {key: 'd', mergeable: true, text: 'd'},
          ],
          true,
        );
        root.append(element);
        setAnchorPoint({
          key: 'd',
          offset: 1,
          type: 'text',
        });
        setFocusPoint({
          key: 'd',
          offset: 1,
          type: 'text',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'c',
            offset: 2,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'c',
            offset: 2,
            type: 'text',
          }),
        );
      });
    });

    test('Can handle an element point on empty element', () => {
      const setupTestCase = (cb) => {
        const editor = createTestEditor();
        editor.update(() => {
          const root = $getRoot();
          const element = createParagraphWithNodes(editor, []);
          root.append(element);
          setAnchorPoint({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          });

          const selection = $getSelection();
          cb(selection, element);
        });
      };

      // getNodes
      setupTestCase((selection, element) => {
        expect(selection.getNodes()).toEqual([element]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('');
      });

      // insertText
      setupTestCase((selection, element) => {
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // insertParagraph
      setupTestCase((selection, element) => {
        selection.insertParagraph();
        const nextElement = element.getNextSibling();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: nextElement.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: nextElement.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // insertLineBreak
      setupTestCase((selection, element) => {
        selection.insertLineBreak(true);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // Format text
      setupTestCase((selection, element) => {
        selection.formatText('bold');
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // Extract selection
      setupTestCase((selection, element) => {
        expect(selection.extract()).toEqual([element]);
      });

      // cloneContents
      setupTestCase((selection, element) => {
        expect($cloneContents(selection)).toEqual({
          nodeMap: [[element.getKey(), element]],
          range: [element.getKey()],
        });
      });
    });

    test('Can handle a start element point', () => {
      const setupTestCase = (cb) => {
        const editor = createTestEditor();
        editor.update(() => {
          const root = $getRoot();
          const element = createParagraphWithNodes(editor, [
            {key: 'a', mergeable: false, text: 'a'},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: false, text: 'c'},
          ]);
          root.append(element);
          setAnchorPoint({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          });

          const selection = $getSelection();
          cb(selection, element);
        });
      };

      // getNodes
      setupTestCase((selection, state) => {
        expect(selection.getNodes()).toEqual([$getNodeByKey('a')]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('');
      });

      // insertText
      setupTestCase((selection, element) => {
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // insertParagraph
      setupTestCase((selection, element) => {
        selection.insertParagraph();
        const firstChild = element;
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // insertLineBreak
      setupTestCase((selection, element) => {
        selection.insertLineBreak(true);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // Format text
      setupTestCase((selection, element) => {
        selection.formatText('bold');
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // Extract selection
      setupTestCase((selection, element) => {
        expect(selection.extract()).toEqual([$getNodeByKey('a')]);
      });

      // cloneContents
      setupTestCase((selection, element) => {
        expect($cloneContents(selection)).toEqual({
          nodeMap: [
            ['a', {...$getNodeByKey('a'), __text: ''}],
            [element.getKey(), {...element, __children: ['a']}],
          ],
          range: [element.getKey()],
        });
      });
    });

    test('Can handle an end element point', () => {
      const setupTestCase = (cb) => {
        const editor = createTestEditor();
        editor.update(() => {
          const root = $getRoot();
          const element = createParagraphWithNodes(editor, [
            {key: 'a', mergeable: false, text: 'a'},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: false, text: 'c'},
          ]);
          root.append(element);
          setAnchorPoint({
            key: element.getKey(),
            offset: 3,
            type: 'element',
          });
          setFocusPoint({
            key: element.getKey(),
            offset: 3,
            type: 'element',
          });

          const selection = $getSelection();
          cb(selection, element);
        });
      };

      // getNodes
      setupTestCase((selection, state) => {
        expect(selection.getNodes()).toEqual([$getNodeByKey('c')]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('');
      });

      // insertText
      setupTestCase((selection, element) => {
        selection.insertText('Test');
        const lastChild = element.getLastChild();
        expect(lastChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: lastChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: lastChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // insertParagraph
      setupTestCase((selection, element) => {
        selection.insertParagraph();
        const nextSibling = element.getNextSibling();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: nextSibling.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: nextSibling.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // insertLineBreak
      setupTestCase((selection, element) => {
        selection.insertLineBreak(true);
        const thirdChild = $getNodeByKey('c');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: thirdChild.getKey(),
            offset: 1,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: thirdChild.getKey(),
            offset: 1,
            type: 'text',
          }),
        );
      });

      // Format text
      setupTestCase((selection, element) => {
        selection.formatText('bold');
        selection.insertText('Test');
        const lastChild = element.getLastChild();
        expect(lastChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: lastChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: lastChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // Extract selection
      setupTestCase((selection, element) => {
        expect(selection.extract()).toEqual([$getNodeByKey('c')]);
      });

      // cloneContents
      setupTestCase((selection, element) => {
        expect($cloneContents(selection)).toEqual({
          nodeMap: [
            ['c', {...$getNodeByKey('c'), __text: ''}],
            [element.getKey(), {...element, __children: ['c']}],
          ],
          range: [element.getKey()],
        });
      });
    });

    test('Has correct element point after merge from middle', async () => {
      const editor = createTestEditor();
      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(editor, [
          {key: 'a', mergeable: true, text: 'a'},
          {key: 'b', mergeable: true, text: 'b'},
          {key: 'c', mergeable: true, text: 'c'},
        ]);
        root.append(element);
        setAnchorPoint({
          key: element.getKey(),
          offset: 2,
          type: 'element',
        });
        setFocusPoint({
          key: element.getKey(),
          offset: 2,
          type: 'element',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 2,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 2,
            type: 'text',
          }),
        );
      });
    });

    test('Has correct element point after merge from end', async () => {
      const editor = createTestEditor();
      const domElement = document.createElement('div');
      let element;

      editor.setRootElement(domElement);

      editor.update(() => {
        const root = $getRoot();
        element = createParagraphWithNodes(editor, [
          {key: 'a', mergeable: true, text: 'a'},
          {key: 'b', mergeable: true, text: 'b'},
          {key: 'c', mergeable: true, text: 'c'},
        ]);
        root.append(element);
        setAnchorPoint({
          key: element.getKey(),
          offset: 3,
          type: 'element',
        });
        setFocusPoint({
          key: element.getKey(),
          offset: 3,
          type: 'element',
        });
      });

      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 3,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 3,
            type: 'text',
          }),
        );
      });
    });
  });

  describe('Simple range', () => {
    test('Can handle multiple text points', () => {
      const setupTestCase = (cb) => {
        const editor = createTestEditor();
        editor.update(() => {
          const root = $getRoot();
          const element = createParagraphWithNodes(editor, [
            {key: 'a', mergeable: false, text: 'a'},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: false, text: 'c'},
          ]);
          root.append(element);
          setAnchorPoint({
            key: 'a',
            offset: 0,
            type: 'text',
          });
          setFocusPoint({
            key: 'b',
            offset: 0,
            type: 'text',
          });

          const selection = $getSelection();
          cb(selection, element);
        });
      };

      // getNodes
      setupTestCase((selection, state) => {
        expect(selection.getNodes()).toEqual([
          $getNodeByKey('a'),
          $getNodeByKey('b'),
        ]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('a');
      });

      // insertText
      setupTestCase((selection, state) => {
        selection.insertText('Test');
        expect($getNodeByKey('a').getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'a',
            offset: 4,
            type: 'text',
          }),
        );
      });

      // insertNodes
      setupTestCase((selection, element) => {
        selection.insertNodes([$createTextNode('foo')]);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 3,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 3,
            type: 'text',
          }),
        );
      });

      // insertParagraph
      setupTestCase((selection) => {
        selection.insertParagraph();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: 'b',
            offset: 0,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: 'b',
            offset: 0,
            type: 'text',
          }),
        );
      });

      // insertLineBreak
      setupTestCase((selection, element) => {
        selection.insertLineBreak(true);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // Format text
      setupTestCase((selection, element) => {
        selection.formatText('bold');
        selection.insertText('Test');
        expect(element.getFirstChild().getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getFirstChild().getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // Extract selection
      setupTestCase((selection, state) => {
        expect(selection.extract()).toEqual([{...$getNodeByKey('a')}]);
      });

      // cloneContents
      setupTestCase((selection, element) => {
        expect($cloneContents(selection)).toEqual({
          nodeMap: [
            ['a', $getNodeByKey('a')],
            [element.getKey(), {...element, __children: ['a', 'b']}],
            ['b', {...$getNodeByKey('b'), __text: ''}],
          ],
          range: [element.getKey()],
        });
      });
    });

    test('Can handle multiple element points', () => {
      const setupTestCase = (cb) => {
        const editor = createTestEditor();
        editor.update(() => {
          const root = $getRoot();
          const element = createParagraphWithNodes(editor, [
            {key: 'a', mergeable: false, text: 'a'},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: false, text: 'c'},
          ]);
          root.append(element);
          setAnchorPoint({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: element.getKey(),
            offset: 1,
            type: 'element',
          });

          const selection = $getSelection();
          cb(selection, element);
        });
      };

      // getNodes
      setupTestCase((selection) => {
        expect(selection.getNodes()).toEqual([
          $getNodeByKey('a'),
          $getNodeByKey('b'),
        ]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('a');
      });

      // insertText
      setupTestCase((selection, element) => {
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // insertParagraph
      setupTestCase((selection, element) => {
        selection.insertParagraph();
        const firstChild = element.getFirstChild();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 0,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 0,
            type: 'text',
          }),
        );
      });

      // insertLineBreak
      setupTestCase((selection, element) => {
        selection.insertLineBreak(true);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // Format text
      setupTestCase((selection, element) => {
        selection.formatText('bold');
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // Extract selection
      setupTestCase((selection, element) => {
        const firstChild = element.getFirstChild();
        expect(selection.extract()).toEqual([firstChild]);
      });

      // cloneContents
      setupTestCase((selection, element) => {
        expect($cloneContents(selection)).toEqual({
          nodeMap: [
            ['a', $getNodeByKey('a')],
            [element.getKey(), {...element, __children: ['a', 'b']}],
            ['b', {...$getNodeByKey('b'), __text: ''}],
          ],
          range: [element.getKey()],
        });
      });
    });

    test('Can handle a mix of text and element points', () => {
      const setupTestCase = (cb) => {
        const editor = createTestEditor();

        editor.update(() => {
          const root = $getRoot();
          const element = createParagraphWithNodes(editor, [
            {key: 'a', mergeable: false, text: 'a'},
            {key: 'b', mergeable: false, text: 'b'},
            {key: 'c', mergeable: false, text: 'c'},
          ]);
          root.append(element);
          setAnchorPoint({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: 'c',
            offset: 1,
            type: 'text',
          });

          const selection = $getSelection();
          cb(selection, element);
        });
      };

      // isBefore
      setupTestCase((selection, state) => {
        expect(selection.anchor.isBefore(selection.focus)).toEqual(true);
      });

      // getNodes
      setupTestCase((selection, state) => {
        expect(selection.getNodes()).toEqual([
          $getNodeByKey('a'),
          $getNodeByKey('b'),
          $getNodeByKey('c'),
        ]);
      });

      // getTextContent
      setupTestCase((selection) => {
        expect(selection.getTextContent()).toEqual('abc');
      });

      // insertText
      setupTestCase((selection, element) => {
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // insertParagraph
      setupTestCase((selection, element) => {
        selection.insertParagraph();
        const nextElement = element.getNextSibling();
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: nextElement.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: nextElement.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // insertLineBreak
      setupTestCase((selection, element) => {
        selection.insertLineBreak(true);
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: element.getKey(),
            offset: 0,
            type: 'element',
          }),
        );
      });

      // Format text
      setupTestCase((selection, element) => {
        selection.formatText('bold');
        selection.insertText('Test');
        const firstChild = element.getFirstChild();
        expect(firstChild.getTextContent()).toBe('Test');
        expect(selection.anchor).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
        expect(selection.focus).toEqual(
          expect.objectContaining({
            key: firstChild.getKey(),
            offset: 4,
            type: 'text',
          }),
        );
      });

      // Extract selection
      setupTestCase((selection, element) => {
        expect(selection.extract()).toEqual([
          $getNodeByKey('a'),
          $getNodeByKey('b'),
          $getNodeByKey('c'),
        ]);
      });

      // cloneContents
      setupTestCase((selection, element) => {
        expect($cloneContents(selection)).toEqual({
          nodeMap: [
            ['a', $getNodeByKey('a')],
            [element.getKey(), element],
            ['b', $getNodeByKey('b')],
            ['c', $getNodeByKey('c')],
          ],
          range: [element.getKey()],
        });
      });
    });
  });

  test('range with multiple paragraphs', async () => {
    const editor = createTestEditor();
    const element = document.createElement('div');
    editor.setRootElement(element);

    await editor.update((state: State) => {
      const root = $getRoot();
      const paragraph1 = $createParagraphNode();
      const paragraph2 = $createParagraphNode();
      const paragraph3 = $createParagraphNode();
      const text1 = $createTextNode('First');
      const text2 = $createTextNode('Second');
      const text3 = $createTextNode('Third');
      root.append(paragraph1, paragraph2, paragraph3);
      paragraph1.append(text1);
      paragraph2.append(text2);
      paragraph3.append(text3);

      text1.select(0, 0);
      const selection1 = $getSelection();
      selection1.focus.set(text3.getKey(), 1, 'text');
      const selectedNodes1 = $cloneContents($getSelection());
      expect(selectedNodes1.range).toEqual([
        paragraph1.getKey(),
        paragraph2.getKey(),
        paragraph3.getKey(),
      ]);
      expect(selectedNodes1.nodeMap[0][0]).toEqual(text1.getKey());
      expect(selectedNodes1.nodeMap[0][1].__text).toBe('First');
      expect(selectedNodes1.nodeMap[1][0]).toEqual(paragraph1.getKey());
      expect(selectedNodes1.nodeMap[2][0]).toEqual(paragraph2.getKey());
      expect(selectedNodes1.nodeMap[3][0]).toEqual(text2.getKey());
      expect(selectedNodes1.nodeMap[4][0]).toEqual(paragraph3.getKey());
      expect(selectedNodes1.nodeMap[5][0]).toEqual(text3.getKey());
      expect(selectedNodes1.nodeMap[5][1].__text).toBe('T');
      expect(() => selectedNodes1.nodeMap[5][1].getTextContent()).toThrow();

      text1.select(1, 1);
      const selection2 = $getSelection();
      selection2.focus.set(text3.getKey(), 4, 'text');
      const selectedNodes2 = $cloneContents($getSelection());
      expect(selectedNodes2.range).toEqual([
        paragraph1.getKey(),
        paragraph2.getKey(),
        paragraph3.getKey(),
      ]);
      expect(selectedNodes2.nodeMap[0][0]).toEqual(text1.getKey());
      expect(selectedNodes2.nodeMap[0][1].__text).toBe('irst');
      expect(selectedNodes2.nodeMap[1][0]).toEqual(paragraph1.getKey());
      expect(selectedNodes2.nodeMap[2][0]).toEqual(paragraph2.getKey());
      expect(selectedNodes2.nodeMap[3][0]).toEqual(text2.getKey());
      expect(selectedNodes2.nodeMap[4][0]).toEqual(paragraph3.getKey());
      expect(selectedNodes2.nodeMap[5][0]).toEqual(text3.getKey());
      expect(selectedNodes2.nodeMap[5][1].__text).toBe('Thir');
    });
  });

  test('range with excludeFromCopy nodes', async () => {
    const editor = createTestEditor();
    const element = document.createElement('div');
    editor.setRootElement(element);

    await editor.update((state: State) => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);

      const excludeElementNode1 = $createTestExcludeFromCopyElementNode();
      paragraph.append(excludeElementNode1);
      paragraph.select(0, 0);
      const selectedNodes1 = $cloneContents($getSelection());
      expect(selectedNodes1.range).toEqual([]);

      const text1 = $createTextNode('1');
      excludeElementNode1.append(text1);
      excludeElementNode1.select(0, 0);
      const selectedNodes2 = $cloneContents($getSelection());
      expect(selectedNodes2.range).toEqual([paragraph.getKey()]);

      paragraph.select(0, 0);
      const selectedNodes3 = $cloneContents($getSelection());
      expect(selectedNodes3.range).toEqual([paragraph.getKey()]);

      const text2 = $createTextNode('2');
      excludeElementNode1.insertAfter(text2);
      paragraph.select(0, 2);
      const selectedNodes4 = $cloneContents($getSelection());
      expect(selectedNodes4.range).toEqual([paragraph.getKey()]);
      expect(selectedNodes4.nodeMap[0][0]).toEqual(text1.getKey());
      expect(selectedNodes4.nodeMap[1][0]).toEqual(paragraph.getKey());
      expect(selectedNodes4.nodeMap[2][0]).toEqual(text2.getKey());

      const text3 = $createTextNode('3');
      excludeElementNode1.append(text3);
      paragraph.select(0, 2);
      const selectedNodes5 = $cloneContents($getSelection());
      expect(selectedNodes5.range).toEqual([paragraph.getKey()]);
      expect(selectedNodes5.nodeMap[0][0]).toEqual(text1.getKey());
      expect(selectedNodes5.nodeMap[1][0]).toEqual(paragraph.getKey());
      expect(selectedNodes5.nodeMap[2][0]).toEqual(text3.getKey());
      expect(selectedNodes5.nodeMap[3][0]).toEqual(text2.getKey());

      const testElementNode = $createTestElementNode();
      const excludeElementNode2 = $createTestExcludeFromCopyElementNode();
      const text4 = $createTextNode('4');
      text1.insertBefore(testElementNode);
      testElementNode.append(excludeElementNode2);
      excludeElementNode2.append(text4);
      paragraph.select(0, 3);
      const selectedNodes6 = $cloneContents($getSelection());
      expect(selectedNodes6.range).toEqual([paragraph.getKey()]);
      expect(selectedNodes6.nodeMap[0][0]).toEqual(text4.getKey());
      expect(selectedNodes6.nodeMap[1][0]).toEqual(testElementNode.getKey());
      expect(selectedNodes6.nodeMap[2][0]).toEqual(paragraph.getKey());
      expect(selectedNodes6.nodeMap[3][0]).toEqual(text1.getKey());
      expect(selectedNodes6.nodeMap[4][0]).toEqual(text3.getKey());
      expect(selectedNodes6.nodeMap[5][0]).toEqual(text2.getKey());

      text4.remove();
      paragraph.select(0, 3);
      const selectedNodes7 = $cloneContents($getSelection());
      expect(selectedNodes7.range).toEqual([paragraph.getKey()]);
      expect(selectedNodes7.nodeMap[0][0]).toEqual(testElementNode.getKey());
      expect(selectedNodes7.nodeMap[1][0]).toEqual(paragraph.getKey());
      expect(selectedNodes7.nodeMap[2][0]).toEqual(text1.getKey());
      expect(selectedNodes7.nodeMap[3][0]).toEqual(text3.getKey());
      expect(selectedNodes7.nodeMap[4][0]).toEqual(text2.getKey());
    });
  });

  describe('can insert non-element nodes correctly', () => {
    describe('with an empty paragraph node selected', () => {
      test('a single text node', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          setAnchorPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          const selection = $getSelection();

          selection.insertNodes([$createTextNode('foo')]);
        });

        expect(element.innerHTML).toBe(
          '<p dir="ltr"><span data-lexical-text="true">foo</span></p>',
        );
      });

      test('two text nodes', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          setAnchorPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          const selection = $getSelection();

          selection.insertNodes([
            $createTextNode('foo'),
            $createTextNode('bar'),
          ]);
        });

        expect(element.innerHTML).toBe(
          '<p dir="ltr"><span data-lexical-text="true">foobar</span></p>',
        );
      });

      test('link insertion without parent element', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          setAnchorPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          const selection = $getSelection();

          const link = $createLinkNode('https://');
          link.append($createTextNode('ello worl'));

          selection.insertNodes([
            $createTextNode('h'),
            link,
            $createTextNode('d'),
          ]);
        });

        expect(element.innerHTML).toBe(
          '<p dir="ltr"><span data-lexical-text="true">h</span><a href="https://" dir="ltr"><span data-lexical-text="true">ello worl</span></a><span data-lexical-text="true">d</span></p>',
        );
      });

      test('a single heading node with a child text node', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          setAnchorPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          const selection = $getSelection();
          const heading = $createHeadingNode('h1');
          const child = $createTextNode('foo');
          heading.append(child);

          selection.insertNodes([heading]);
        });

        expect(element.innerHTML).toBe(
          '<h1 dir="ltr"><span data-lexical-text="true">foo</span></h1>',
        );
      });

      test('a heading node with a child text node and a disjoint sibling text node should throw', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);

          setAnchorPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          setFocusPoint({
            key: paragraph.getKey(),
            offset: 0,
            type: 'element',
          });
          const selection = $getSelection();
          const heading = $createHeadingNode('h1');
          const child = $createTextNode('foo');
          heading.append(child);

          expect(() => {
            selection.insertNodes([heading, $createTextNode('bar')]);
          }).toThrow();
        });

        expect(element.innerHTML).toBe(
          '<h1 dir="ltr"><span data-lexical-text="true">foo</span></h1>',
        );
      });
    });

    describe('with a paragraph node selected on some existing text', () => {
      test('a single text node', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const text = $createTextNode('Existing text...');
          paragraph.append(text);
          root.append(paragraph);

          setAnchorPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          setFocusPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          const selection = $getSelection();

          selection.insertNodes([$createTextNode('foo')]);
        });

        expect(element.innerHTML).toBe(
          '<p dir="ltr"><span data-lexical-text="true">Existing text...foo</span></p>',
        );
      });

      test('two text nodes', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const text = $createTextNode('Existing text...');
          paragraph.append(text);
          root.append(paragraph);

          setAnchorPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          setFocusPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          const selection = $getSelection();

          selection.insertNodes([
            $createTextNode('foo'),
            $createTextNode('bar'),
          ]);
        });

        expect(element.innerHTML).toBe(
          '<p dir="ltr"><span data-lexical-text="true">Existing text...foobar</span></p>',
        );
      });

      test('a single heading node with a child text node', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const text = $createTextNode('Existing text...');
          paragraph.append(text);
          root.append(paragraph);

          setAnchorPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          setFocusPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          const selection = $getSelection();
          const heading = $createHeadingNode('h1');
          const child = $createTextNode('foo');
          heading.append(child);

          selection.insertNodes([heading]);
        });

        expect(element.innerHTML).toBe(
          '<p dir="ltr"><span data-lexical-text="true">Existing text...foo</span></p>',
        );
      });

      test('a heading node with a child text node and a disjoint sibling text node should throw', async () => {
        const editor = createTestEditor();
        const element = document.createElement('div');
        editor.setRootElement(element);

        await editor.update((state: State) => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const text = $createTextNode('Existing text...');
          paragraph.append(text);
          root.append(paragraph);

          setAnchorPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          setFocusPoint({
            key: text.getKey(),
            offset: 16,
            type: 'text',
          });
          const selection = $getSelection();
          const heading = $createHeadingNode('h1');
          const child = $createTextNode('foo');
          heading.append(child);

          expect(() => {
            selection.insertNodes([heading, $createTextNode('bar')]);
          }).toThrow();
        });

        expect(element.innerHTML).toBe(
          '<p dir="ltr"><span data-lexical-text="true">Existing text...foo</span></p>',
        );
      });
    });
  });
});

describe('extract', () => {
  test('', async () => {
    const editor = createTestEditor();
    const element = document.createElement('div');
    editor.setRootElement(element);
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const text = $createTextNode('Existing text...');
      paragraph.append(text);
      root.append(paragraph);

      setAnchorPoint({
        key: text.getKey(),
        offset: 16,
        type: 'text',
      });
      setFocusPoint({
        key: text.getKey(),
        offset: 16,
        type: 'text',
      });
      const selection = $getSelection();
      expect(selection.extract()).toEqual([]);
    });
  });
});
