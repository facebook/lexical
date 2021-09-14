/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_BOLD} from '../../core/OutlineConstants';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {BlockNode, createEditor, createTextNode} from 'outline';

class TestBlockNode extends BlockNode {
  static deserialize() {
    // TODO
  }
  clone() {
    const clone = new TestBlockNode(this.__key);
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
}

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

  function useOutlineEditor(rootElementRef) {
    const editor = React.useMemo(() => createEditor(), []);

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
      editor = useOutlineEditor(ref);
      editor.addListener('error', (error) => {
        throw error;
      });
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.createRoot(container).render(<TestBase />);
    });

    // Insert initial block
    await update((view) => {
      const block = new TestBlockNode();
      const text = createTextNode('Foo');
      const text2 = createTextNode('Bar');
      // Prevent text nodes from combining.
      text2.setFlags(IS_BOLD);
      const text3 = createTextNode('Baz');

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
      await update(() => {
        const block = new TestBlockNode();
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
      await update((view) => {
        const block = new TestBlockNode();
        const innerBlock = new TestBlockNode();
        const text = createTextNode('Foo');
        text.select(0, 0);
        const text2 = createTextNode('Bar');
        const text3 = createTextNode('Baz');
        const text4 = createTextNode('Qux');

        block.append(text);
        block.append(innerBlock);
        block.append(text4);

        innerBlock.append(text2);
        innerBlock.append(text3);

        const children = block.getAllTextNodes();
        expect(children).toHaveLength(4);
        expect(children).toEqual([text, text2, text3, text4]);

        const innerInnerBlock = new TestBlockNode();
        const text5 = createTextNode('More');
        const text6 = createTextNode('Stuff');
        innerInnerBlock.append(text5);
        innerInnerBlock.append(text6);
        innerBlock.append(innerInnerBlock);

        const children2 = block.getAllTextNodes();
        expect(children2).toHaveLength(6);
        expect(children2).toEqual([text, text2, text3, text5, text6, text4]);
        view.getRoot().append(block);
      });
    });

    // TODO: Add tests where there are nested inert nodes.
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
        const block = new TestBlockNode();
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
        const block = new TestBlockNode();
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
        const block = new TestBlockNode();
        expect(block.getTextContent()).toBe('');
      });
    });

    test('nested', async () => {
      await update((view) => {
        const block = new TestBlockNode();
        const innerBlock = new TestBlockNode();
        const text = createTextNode('Foo');
        text.select(0, 0);
        const text2 = createTextNode('Bar');
        const text3 = createTextNode('Baz');
        text3.makeInert();
        const text4 = createTextNode('Qux');

        block.append(text);
        block.append(innerBlock);
        block.append(text4);

        innerBlock.append(text2);
        innerBlock.append(text3);

        expect(block.getTextContent()).toEqual('FooBar\n\nQux');
        expect(block.getTextContent(true)).toEqual('FooBarBaz\n\nQux');

        const innerInnerBlock = new TestBlockNode();
        const text5 = createTextNode('More');
        text5.makeInert();
        const text6 = createTextNode('Stuff');
        innerInnerBlock.append(text5);
        innerInnerBlock.append(text6);
        innerBlock.append(innerInnerBlock);

        expect(block.getTextContent()).toEqual('FooBarStuff\n\nQux');
        expect(block.getTextContent(true)).toEqual('FooBarBazMoreStuff\n\nQux');
        view.getRoot().append(block);
      });
    });
  });
});
