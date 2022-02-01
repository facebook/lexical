/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {$createTextNode, $getRoot, TextNode} from 'lexical';
import {
  $createTestElementNode,
  createTestEditor,
} from '../../../../__tests__/utils';

describe('LexicalElementNode tests', () => {
  let container = null;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  function useLexicalEditor(rootElementRef) {
    const editor = React.useMemo(() => createTestEditor(), []);

    React.useEffect(() => {
      const rootElement = rootElementRef.current;

      editor.setRootElement(rootElement);
    }, [rootElementRef, editor]);

    return editor;
  }

  let editor = null;

  async function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useLexicalEditor(ref);
      editor.addListener('error', (error) => {
        throw error;
      });
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.createRoot(container).render(<TestBase />);
    });

    // Insert initial block
    await update(() => {
      const block = $createTestElementNode();
      const text = $createTextNode('Foo');
      const text2 = $createTextNode('Bar');
      // Prevent text nodes from combining.
      text2.setMode('segmented');
      const text3 = $createTextNode('Baz');

      // Some operations require a selection to exist, hence
      // we make a selection in the setup code.
      text.select(0, 0);
      block.append(text, text2, text3);
      $getRoot().append(block);
    });
  }

  describe('getChildren()', () => {
    test('no children', async () => {
      await update(() => {
        const block = $createTestElementNode();
        const children = block.getChildren();
        expect(children).toHaveLength(0);
        expect(children).toEqual([]);
      });
    });

    test('some children', async () => {
      await update(() => {
        const children = $getRoot().getFirstChild().getChildren();
        expect(children).toHaveLength(3);
      });
    });
  });

  describe('getAllTextNodes()', () => {
    test('basic', async () => {
      await update(() => {
        const textNodes = $getRoot().getFirstChild().getAllTextNodes();
        expect(textNodes).toHaveLength(3);
      });
    });

    test('nested', async () => {
      await update(() => {
        const block = $createTestElementNode();
        const innerBlock = $createTestElementNode();
        const text = $createTextNode('Foo');
        text.select(0, 0);
        const text2 = $createTextNode('Bar');
        const text3 = $createTextNode('Baz');
        const text4 = $createTextNode('Qux');

        block.append(text, innerBlock, text4);
        innerBlock.append(text2, text3);

        const children = block.getAllTextNodes();
        expect(children).toHaveLength(4);
        expect(children).toEqual([text, text2, text3, text4]);

        const innerInnerBlock = $createTestElementNode();
        const text5 = $createTextNode('More');
        const text6 = $createTextNode('Stuff');
        innerInnerBlock.append(text5, text6);
        innerBlock.append(innerInnerBlock);

        const children2 = block.getAllTextNodes();
        expect(children2).toHaveLength(6);
        expect(children2).toEqual([text, text2, text3, text5, text6, text4]);
        $getRoot().append(block);
      });
    });

    // TODO: Add tests where there are nested inert nodes.
  });

  describe('getFirstChild()', () => {
    test('basic', async () => {
      await update(() => {
        expect(
          $getRoot().getFirstChild().getFirstChild().getTextContent(),
        ).toBe('Foo');
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = $createTestElementNode();
        expect(block.getFirstChild()).toBe(null);
      });
    });
  });

  describe('getLastChild()', () => {
    test('basic', async () => {
      await update(() => {
        expect($getRoot().getFirstChild().getLastChild().getTextContent()).toBe(
          'Baz',
        );
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = $createTestElementNode();
        expect(block.getLastChild()).toBe(null);
      });
    });
  });

  describe('getTextContent()', () => {
    test('basic', async () => {
      await update(() => {
        expect($getRoot().getFirstChild().getTextContent()).toBe('FooBarBaz');
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = $createTestElementNode();
        expect(block.getTextContent()).toBe('');
      });
    });

    test('nested', async () => {
      await update(() => {
        const block = $createTestElementNode();
        const innerBlock = $createTestElementNode();
        const text = $createTextNode('Foo');
        text.select(0, 0);
        const text2 = $createTextNode('Bar');
        const text3 = $createTextNode('Baz');
        text3.setMode('inert');
        const text4 = $createTextNode('Qux');

        block.append(text, innerBlock, text4);
        innerBlock.append(text2, text3);

        expect(block.getTextContent()).toEqual('FooBar\n\nQux');
        expect(block.getTextContent(true)).toEqual('FooBarBaz\n\nQux');

        const innerInnerBlock = $createTestElementNode();
        const text5 = $createTextNode('More');
        text5.setMode('inert');
        const text6 = $createTextNode('Stuff');
        innerInnerBlock.append(text5, text6);
        innerBlock.append(innerInnerBlock);

        expect(block.getTextContent()).toEqual('FooBarStuff\n\nQux');
        expect(block.getTextContent(true)).toEqual('FooBarBazMoreStuff\n\nQux');
        $getRoot().append(block);
      });
    });
  });

  describe('splice', () => {
    let block;

    beforeEach(async () => {
      await update(() => {
        block = $getRoot().getFirstChildOrThrow();
      });
    });

    const BASE_INSERTIONS: Array<{
      name: string,
      start: number,
      deleteCount: number,
      expectedText: string,
      skipNodes: ?boolean,
    }> = [
      // Do nothing
      {
        name: 'Insert in the beginning',
        start: 0,
        deleteCount: 0,
        skipNodes: true,
        expectedText: 'FooBarBaz',
      },

      // Insert
      {
        name: 'Insert in the beginning',
        start: 0,
        deleteCount: 0,
        expectedText: 'QuxQuuzFooBarBaz',
      },
      {
        name: 'Insert in the middle',
        start: 1,
        deleteCount: 0,
        expectedText: 'FooQuxQuuzBarBaz',
      },
      {
        name: 'Insert in the end',
        start: 3,
        deleteCount: 0,
        expectedText: 'FooBarBazQuxQuuz',
      },

      // Delete
      {
        name: 'Delete in the beginning',
        start: 0,
        deleteCount: 1,
        skipNodes: true,
        expectedText: 'BarBaz',
      },
      {
        name: 'Delete in the middle',
        start: 1,
        deleteCount: 1,
        skipNodes: true,
        expectedText: 'FooBaz',
      },
      {
        name: 'Delete in the end',
        start: 2,
        deleteCount: 1,
        skipNodes: true,
        expectedText: 'FooBar',
      },
      {
        name: 'Delete all',
        start: 0,
        deleteCount: 3,
        skipNodes: true,
        expectedText: '',
      },

      // Replace
      {
        name: 'Replace in the beginning',
        start: 0,
        deleteCount: 1,
        expectedText: 'QuxQuuzBarBaz',
      },
      {
        name: 'Replace in the middle',
        start: 1,
        deleteCount: 1,
        expectedText: 'FooQuxQuuzBaz',
      },
      {
        name: 'Replace in the end',
        start: 2,
        deleteCount: 1,
        expectedText: 'FooBarQuxQuuz',
      },
      {
        name: 'Replace all',
        start: 0,
        deleteCount: 3,
        expectedText: 'QuxQuuz',
      },
    ];

    BASE_INSERTIONS.forEach((testCase) => {
      it(testCase.name, async () => {
        await update(() => {
          block.splice(
            testCase.start,
            testCase.deleteCount,
            testCase.skipNodes
              ? []
              : [$createTextNode('Qux'), $createTextNode('Quuz')],
          );

          // TODO:
          // Manually update selection, since selected node might've been deleted
          // Temp code till selection retention is added to splice
          block.select();
          expect(block.getTextContent()).toEqual(testCase.expectedText);
        });
      });
    });

    it('Running transforms for inserted nodes, their previous siblings and new siblings', async () => {
      const transforms = new Set();
      const expectedTransforms = [];

      const removeTransform = editor.addTransform(TextNode, (node) => {
        transforms.add(node.__key);
      });

      await update(() => {
        const anotherBlock = $createTestElementNode();
        const text1 = $createTextNode('1');
        // Prevent text nodes from combining
        const text2 = $createTextNode('2');
        text2.setMode('segmented');
        const text3 = $createTextNode('3');
        anotherBlock.append(text1, text2, text3);
        $getRoot().append(anotherBlock);

        // Expect inserted node, its old siblings and new siblings to receive
        // transformer calls
        expectedTransforms.push(
          text1.__key,
          text2.__key,
          text3.__key,
          block.getChildAtIndex(0).__key,
          block.getChildAtIndex(1).__key,
        );
      });

      await update(() => {
        block.splice(1, 0, [$getRoot().getLastChild().getChildAtIndex(1)]);
      });

      removeTransform();

      await update(() => {
        expect(block.getTextContent()).toEqual('Foo2BarBaz');
        expectedTransforms.forEach((key) => {
          expect(transforms.has(key)).toBe(true);
        });
      });
    });
  });
});
