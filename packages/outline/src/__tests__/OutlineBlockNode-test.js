/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_BOLD} from '../OutlineConstants';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import Outline from 'outline';

describe('OutlineBlockNode tests', () => {
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

  function useOutlineEditor(editorElementRef) {
    const editor = React.useMemo(() => Outline.createEditor(), []);

    React.useEffect(() => {
      const editorElement = editorElementRef.current;

      editor.setEditorElement(editorElement);
    }, [editorElementRef, editor]);

    return editor;
  }

  let editor = null;

  async function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });

    // Insert initial block
    await update((view) => {
      const block = new Outline.BlockNode();
      const text = Outline.createTextNode('Foo');
      const text2 = Outline.createTextNode('Bar');
      // Prevent text nodes from combining.
      text2.setFlags(IS_BOLD);
      const text3 = Outline.createTextNode('Baz');

      // Some operations require a selection to exist, hence
      // we make a selection in the setup code.
      text.select(0, 0);
      block.append(text);
      block.append(text2);
      block.append(text3);
      view.getRoot().append(block);
    });
  }

  describe('getChildren()', () => {
    test('no children', async () => {
      await update((view) => {
        const block = new Outline.BlockNode();
        const children = block.getChildren();
        expect(children).toHaveLength(0);
        expect(children).toEqual([]);
      });
    });

    test('some children', async () => {
      await update((view) => {
        const children = view.getRoot().getFirstChild().getChildren();
        expect(children).toHaveLength(3);
      });
    });
  });

  describe('getAllTextNodes()', () => {
    test('basic', async () => {
      await update((view) => {
        const textNodes = view.getRoot().getFirstChild().getAllTextNodes();
        expect(textNodes).toHaveLength(3);
      });
    });

    test('nested', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        const innerBlock = new Outline.BlockNode();
        const text = Outline.createTextNode('Foo');
        text.select(0, 0);
        const text2 = Outline.createTextNode('Bar');
        const text3 = Outline.createTextNode('Baz');
        const text4 = Outline.createTextNode('Qux');

        block.append(text);
        block.append(innerBlock);
        block.append(text4);

        innerBlock.append(text2);
        innerBlock.append(text3);

        const children = block.getAllTextNodes();
        expect(children).toHaveLength(4);
        expect(children).toEqual([text, text2, text3, text4]);

        const innerInnerBlock = new Outline.BlockNode();
        const text5 = Outline.createTextNode('More');
        const text6 = Outline.createTextNode('Stuff');
        innerInnerBlock.append(text5);
        innerInnerBlock.append(text6);
        innerBlock.append(innerInnerBlock);

        const children2 = block.getAllTextNodes();
        expect(children2).toHaveLength(6);
        expect(children2).toEqual([text, text2, text3, text5, text6, text4]);
      });
    });

    // TODO: Add tests where there are nested inert nodes.
  });

  describe('getFirstTextNode()', () => {
    test('basic', async () => {
      await update((view) => {
        expect(
          view.getRoot().getFirstChild().getFirstTextNode().getTextContent(),
        ).toBe('Foo');
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        expect(block.getFirstTextNode()).toBe(null);
      });
    });

    test('inert', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        const inertNode = Outline.createTextNode('Foo');
        inertNode.makeInert();
        inertNode.select(0, 0);
        const text = Outline.createTextNode('Bar');

        block.append(inertNode);
        block.append(text);
        expect(block.getFirstTextNode()).not.toEqual(inertNode);
        expect(block.getFirstTextNode(true).getTextContent()).toEqual('');
      });
    });

    test('nested', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        const innerBlock = new Outline.BlockNode();
        const text = Outline.createTextNode('Foo');
        const text2 = Outline.createTextNode('Bar');
        text.select(0, 0);

        block.append(innerBlock);
        innerBlock.append(text);
        innerBlock.append(text2);

        expect(block.getFirstTextNode()).toBe(text);
      });
    });
  });

  describe('getLastTextNode()', () => {
    test('basic', async () => {
      await update((view) => {
        expect(
          view.getRoot().getFirstChild().getLastTextNode().getTextContent(),
        ).toBe('Baz');
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        expect(block.getLastTextNode()).toBe(null);
      });
    });

    test('inert', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        const text = Outline.createTextNode('Foo');
        const inertNode = Outline.createTextNode('Bar');
        inertNode.makeInert();
        inertNode.select(0, 0);

        block.append(text);
        block.append(inertNode);
        expect(block.getLastTextNode()).not.toEqual(inertNode);
        expect(block.getLastTextNode(true).getTextContent()).toBe('');
      });
    });

    test('nested', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        const innerBlock = new Outline.BlockNode();
        const text = Outline.createTextNode('Foo');
        const text2 = Outline.createTextNode('Bar');
        text.select(0, 0);

        block.append(innerBlock);
        innerBlock.append(text);
        innerBlock.append(text2);

        expect(block.getLastTextNode().getTextContent()).toBe('Bar');
      });
    });
  });

  describe('getFirstChild()', () => {
    test('basic', async () => {
      await update((view) => {
        expect(
          view.getRoot().getFirstChild().getFirstChild().getTextContent(),
        ).toBe('Foo');
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        expect(block.getFirstChild()).toBe(null);
      });
    });
  });

  describe('getLastChild()', () => {
    test('basic', async () => {
      await update((view) => {
        expect(
          view.getRoot().getFirstChild().getLastChild().getTextContent(),
        ).toBe('Baz');
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        expect(block.getLastChild()).toBe(null);
      });
    });
  });

  describe('getTextContent()', () => {
    test('basic', async () => {
      await update((view) => {
        expect(view.getRoot().getFirstChild().getTextContent()).toBe(
          'FooBarBaz',
        );
      });
    });

    test('empty', async () => {
      await update(() => {
        const block = new Outline.BlockNode();
        expect(block.getTextContent()).toBe('');
      });
    });

    test('nested', async () => {
      const block = new Outline.BlockNode();
      const innerBlock = new Outline.BlockNode();
      const text = Outline.createTextNode('Foo');
      text.select(0, 0);
      const text2 = Outline.createTextNode('Bar');
      const text3 = Outline.createTextNode('Baz');
      text3.makeInert();
      const text4 = Outline.createTextNode('Qux');

      block.append(text);
      block.append(innerBlock);
      block.append(text4);

      innerBlock.append(text2);
      innerBlock.append(text3);

      expect(block.getTextContent()).toEqual('FooBar\n\nQux');
      expect(block.getTextContent(true)).toEqual('FooBarBaz\n\nQux');

      const innerInnerBlock = new Outline.BlockNode();
      const text5 = Outline.createTextNode('More');
      text5.makeInert();
      const text6 = Outline.createTextNode('Stuff');
      innerInnerBlock.append(text5);
      innerInnerBlock.append(text6);
      innerBlock.append(innerInnerBlock);

      expect(block.getTextContent()).toEqual('FooBarStuff\n\nQux');
      expect(block.getTextContent(true)).toEqual('FooBarBazMoreStuff\n\nQux');
    });
  });
});
