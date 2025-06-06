/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
  ElementDOMSlot,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  TextNode,
} from 'lexical';
import * as React from 'react';
import {createRef, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';

import {
  $createTestElementNode,
  createTestEditor,
} from '../../../__tests__/utils';
import {indexPath, SerializedElementNode} from '../../LexicalElementNode';

describe('LexicalElementNode tests', () => {
  let container: HTMLElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    await init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    // @ts-ignore
    container = null;
  });

  async function update(fn: () => void) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  function useLexicalEditor(rootElementRef: React.RefObject<HTMLDivElement>) {
    const editor = React.useMemo(() => createTestEditor(), []);

    useEffect(() => {
      const rootElement = rootElementRef.current;
      editor.setRootElement(rootElement);
    }, [rootElementRef, editor]);

    return editor;
  }

  let editor: LexicalEditor;

  async function init() {
    const ref = createRef<HTMLDivElement>();

    function TestBase() {
      editor = useLexicalEditor(ref);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      createRoot(container).render(<TestBase />);
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

  describe('exportJSON()', () => {
    test('should return and object conforming to the expected schema', async () => {
      await update(() => {
        const node = $createTestElementNode();

        // If you broke this test, you changed the public interface of a
        // serialized Lexical Core Node. Please ensure the correct adapter
        // logic is in place in the corresponding importJSON  method
        // to accommodate these changes.

        expect(node.exportJSON()).toStrictEqual({
          children: [],
          direction: null,
          format: '',
          indent: 0,
          type: 'test_block',
          version: 1,
        });
      });
    });
  });

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
        const children = $getRoot().getFirstChild<ElementNode>()!.getChildren();
        expect(children).toHaveLength(3);
      });
    });
  });

  describe('getAllTextNodes()', () => {
    test('basic', async () => {
      await update(() => {
        const textNodes = $getRoot()
          .getFirstChild<ElementNode>()!
          .getAllTextNodes();
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
  });

  describe('getFirstChild()', () => {
    test('basic', async () => {
      await update(() => {
        expect(
          $getRoot()
            .getFirstChild<ElementNode>()!
            .getFirstChild()!
            .getTextContent(),
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
        expect(
          $getRoot()
            .getFirstChild<ElementNode>()!
            .getLastChild()!
            .getTextContent(),
        ).toBe('Baz');
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
        expect($getRoot().getFirstChild()!.getTextContent()).toBe('FooBarBaz');
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
        text3.setMode('token');
        const text4 = $createTextNode('Qux');
        block.append(text, innerBlock, text4);
        innerBlock.append(text2, text3);

        expect(block.getTextContent()).toEqual('FooBarBaz\n\nQux');

        const innerInnerBlock = $createTestElementNode();
        const text5 = $createTextNode('More');
        text5.setMode('token');
        const text6 = $createTextNode('Stuff');
        innerInnerBlock.append(text5, text6);
        innerBlock.append(innerInnerBlock);

        expect(block.getTextContent()).toEqual('FooBarBazMoreStuff\n\nQux');

        $getRoot().append(block);
      });
    });
  });

  describe('getTextContentSize()', () => {
    test('basic', async () => {
      await update(() => {
        expect($getRoot().getFirstChild()!.getTextContentSize()).toBe(
          $getRoot().getFirstChild()!.getTextContent().length,
        );
      });
    });

    test('child node getTextContentSize() can be overridden and is then reflected when calling the same method on parent node', async () => {
      await update(() => {
        const block = $createTestElementNode();
        const text = $createTextNode('Foo');
        text.getTextContentSize = () => 1;
        block.append(text);

        expect(block.getTextContentSize()).toBe(1);
      });
    });
  });

  describe('splice', () => {
    let block: ElementNode;

    beforeEach(async () => {
      await update(() => {
        block = $getRoot().getFirstChildOrThrow();
      });
    });

    const BASE_INSERTIONS: Array<{
      deleteCount: number;
      deleteOnly: boolean | null | undefined;
      expectedText: string;
      name: string;
      start: number;
    }> = [
      // Do nothing
      {
        deleteCount: 0,
        deleteOnly: true,
        expectedText: 'FooBarBaz',
        name: 'Do nothing',
        start: 0,
      },
      // Insert
      {
        deleteCount: 0,
        deleteOnly: false,
        expectedText: 'QuxQuuzFooBarBaz',
        name: 'Insert in the beginning',
        start: 0,
      },
      {
        deleteCount: 0,
        deleteOnly: false,
        expectedText: 'FooQuxQuuzBarBaz',
        name: 'Insert in the middle',
        start: 1,
      },
      {
        deleteCount: 0,
        deleteOnly: false,
        expectedText: 'FooBarBazQuxQuuz',
        name: 'Insert in the end',
        start: 3,
      },
      // Delete
      {
        deleteCount: 1,
        deleteOnly: true,
        expectedText: 'BarBaz',
        name: 'Delete in the beginning',
        start: 0,
      },
      {
        deleteCount: 1,
        deleteOnly: true,
        expectedText: 'FooBaz',
        name: 'Delete in the middle',
        start: 1,
      },
      {
        deleteCount: 1,
        deleteOnly: true,
        expectedText: 'FooBar',
        name: 'Delete in the end',
        start: 2,
      },
      {
        deleteCount: 3,
        deleteOnly: true,
        expectedText: '',
        name: 'Delete all',
        start: 0,
      },
      // Replace
      {
        deleteCount: 1,
        deleteOnly: false,
        expectedText: 'QuxQuuzBarBaz',
        name: 'Replace in the beginning',
        start: 0,
      },
      {
        deleteCount: 1,
        deleteOnly: false,
        expectedText: 'FooQuxQuuzBaz',
        name: 'Replace in the middle',
        start: 1,
      },
      {
        deleteCount: 1,
        deleteOnly: false,
        expectedText: 'FooBarQuxQuuz',
        name: 'Replace in the end',
        start: 2,
      },
      {
        deleteCount: 3,
        deleteOnly: false,
        expectedText: 'QuxQuuz',
        name: 'Replace all',
        start: 0,
      },
    ];

    BASE_INSERTIONS.forEach((testCase) => {
      it(`Plain text: ${testCase.name}`, async () => {
        await update(() => {
          block.splice(
            testCase.start,
            testCase.deleteCount,
            testCase.deleteOnly
              ? []
              : [$createTextNode('Qux'), $createTextNode('Quuz')],
          );

          expect(block.getTextContent()).toEqual(testCase.expectedText);
        });
      });
    });

    let nodes: Record<string, LexicalNode> = {};

    const NESTED_ELEMENTS_TESTS: Array<{
      deleteCount: number;
      deleteOnly?: boolean;
      expectedSelection: () => {
        anchor: {
          key: string;
          offset: number;
          type: string;
        };
        focus: {
          key: string;
          offset: number;
          type: string;
        };
      };
      expectedText: string;
      name: string;
      start: number;
    }> = [
      {
        deleteCount: 0,
        deleteOnly: true,
        expectedSelection: () => {
          return {
            anchor: {
              key: nodes.nestedText1.__key,
              offset: 1,
              type: 'text',
            },
            focus: {
              key: nodes.nestedText1.__key,
              offset: 1,
              type: 'text',
            },
          };
        },
        expectedText: 'FooWiz\n\nFuz\n\nBar',
        name: 'Do nothing',
        start: 1,
      },
      {
        deleteCount: 1,
        deleteOnly: true,
        expectedSelection: () => {
          return {
            anchor: {
              key: nodes.text1.__key,
              offset: 3,
              type: 'text',
            },
            focus: {
              key: nodes.text1.__key,
              offset: 3,
              type: 'text',
            },
          };
        },
        expectedText: 'FooFuz\n\nBar',
        name: 'Delete selected element (selection moves to the previous)',
        start: 1,
      },
      {
        deleteCount: 1,
        expectedSelection: () => {
          return {
            anchor: {
              key: nodes.text1.__key,
              offset: 3,
              type: 'text',
            },
            focus: {
              key: nodes.text1.__key,
              offset: 3,
              type: 'text',
            },
          };
        },
        expectedText: 'FooQuxQuuzFuz\n\nBar',
        name: 'Replace selected element (selection moves to the previous)',
        start: 1,
      },
      {
        deleteCount: 2,
        deleteOnly: true,
        expectedSelection: () => {
          return {
            anchor: {
              key: nodes.nestedText2.__key,
              offset: 0,
              type: 'text',
            },
            focus: {
              key: nodes.nestedText2.__key,
              offset: 0,
              type: 'text',
            },
          };
        },
        expectedText: 'Fuz\n\nBar',
        name: 'Delete selected with previous element (selection moves to the next)',
        start: 0,
      },
      {
        deleteCount: 4,
        deleteOnly: true,
        expectedSelection: () => {
          return {
            anchor: {
              key: block.__key,
              offset: 0,
              type: 'element',
            },
            focus: {
              key: block.__key,
              offset: 0,
              type: 'element',
            },
          };
        },
        expectedText: '',
        name: 'Delete selected with all siblings (selection moves up to the element)',
        start: 0,
      },
    ];

    NESTED_ELEMENTS_TESTS.forEach((testCase) => {
      it(`Nested elements: ${testCase.name}`, async () => {
        await update(() => {
          const text1 = $createTextNode('Foo');
          const text2 = $createTextNode('Bar');

          const nestedBlock1 = $createTestElementNode();
          const nestedText1 = $createTextNode('Wiz');
          nestedBlock1.append(nestedText1);

          const nestedBlock2 = $createTestElementNode();
          const nestedText2 = $createTextNode('Fuz');
          nestedBlock2.append(nestedText2);

          block.clear();
          block.append(text1, nestedBlock1, nestedBlock2, text2);
          nestedText1.select(1, 1);

          expect(block.getTextContent()).toEqual('FooWiz\n\nFuz\n\nBar');

          nodes = {
            nestedBlock1,
            nestedBlock2,
            nestedText1,
            nestedText2,
            text1,
            text2,
          };
        });

        await update(() => {
          block.splice(
            testCase.start,
            testCase.deleteCount,
            testCase.deleteOnly
              ? []
              : [$createTextNode('Qux'), $createTextNode('Quuz')],
          );
        });

        await update(() => {
          expect(block.getTextContent()).toEqual(testCase.expectedText);

          const selection = $getSelection();
          const expectedSelection = testCase.expectedSelection();

          if (!$isRangeSelection(selection)) {
            return;
          }

          expect({
            key: selection.anchor.key,
            offset: selection.anchor.offset,
            type: selection.anchor.type,
          }).toEqual(expectedSelection.anchor);
          expect({
            key: selection.focus.key,
            offset: selection.focus.offset,
            type: selection.focus.type,
          }).toEqual(expectedSelection.focus);
        });
      });
    });

    it('Running transforms for inserted nodes, their previous siblings and new siblings', async () => {
      const transforms = new Set();
      const expectedTransforms: string[] = [];

      const removeTransform = editor.registerNodeTransform(TextNode, (node) => {
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
          block.getChildAtIndex(0)!.__key,
          block.getChildAtIndex(1)!.__key,
        );
      });

      await update(() => {
        block.splice(1, 0, [
          $getRoot().getLastChild<ElementNode>()!.getChildAtIndex(1)!,
        ]);
      });

      removeTransform();

      await update(() => {
        expect(block.getTextContent()).toEqual('Foo2BarBaz');
        expectedTransforms.forEach((key) => {
          expect(transforms).toContain(key);
        });
      });
    });
  });
});

describe('getDOMSlot tests', () => {
  let container: HTMLElement;
  let editor: LexicalEditor;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = createEditor({
      nodes: [WrapperElementNode],
      onError: (error) => {
        throw error;
      },
    });
    editor.setRootElement(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // @ts-ignore
    container = null;
  });

  class WrapperElementNode extends ElementNode {
    static getType() {
      return 'wrapper';
    }
    static clone(node: WrapperElementNode): WrapperElementNode {
      return new WrapperElementNode(node.__key);
    }
    createDOM() {
      const el = document.createElement('main');
      el.appendChild(document.createElement('section'));
      return el;
    }
    updateDOM() {
      return false;
    }
    getDOMSlot(dom: HTMLElement): ElementDOMSlot {
      return super.getDOMSlot(dom).withElement(dom.querySelector('section')!);
    }
    exportJSON(): SerializedElementNode {
      throw new Error('Not implemented');
    }
    static importJSON(): WrapperElementNode {
      throw new Error('Not implemented');
    }
  }
  function $createWrapperElementNode(): WrapperElementNode {
    return $applyNodeReplacement(new WrapperElementNode());
  }

  test('can create wrapper', () => {
    let wrapper: WrapperElementNode;
    editor.update(
      () => {
        wrapper = $createWrapperElementNode().append(
          $createTextNode('test text').setMode('token'),
        );
        $getRoot().clear().append(wrapper);
      },
      {discrete: true},
    );
    expect(container.innerHTML).toBe(
      `<main dir="ltr"><section><span data-lexical-text="true">test text</span></section></main>`,
    );
    editor.update(
      () => {
        wrapper.append($createTextNode('more text').setMode('token'));
      },
      {discrete: true},
    );
    expect(container.innerHTML).toBe(
      `<main dir="ltr"><section><span data-lexical-text="true">test text</span><span data-lexical-text="true">more text</span></section></main>`,
    );
    editor.update(
      () => {
        wrapper.clear();
      },
      {discrete: true},
    );
    expect(container.innerHTML).toBe(`<main><section><br></section></main>`);
  });
});

describe('indexPath', () => {
  test('no path', () => {
    const root = document.createElement('div');
    expect(indexPath(root, root)).toEqual([]);
  });
  test('only child', () => {
    const root = document.createElement('div');
    const child = document.createElement('div');
    root.appendChild(child);
    expect(indexPath(root, child)).toEqual([0]);
  });
  test('nested child', () => {
    const root = document.createElement('div');
    const parent = document.createElement('div');
    const child = document.createElement('div');
    root.appendChild(parent);
    parent.appendChild(child);
    expect(indexPath(root, child)).toEqual([0, 0]);
  });
  test('nested child with siblings', () => {
    const root = document.createElement('div');
    const parent = document.createElement('div');
    const child = document.createElement('div');
    root.appendChild(document.createElement('span'));
    root.appendChild(parent);
    root.appendChild(document.createElement('span'));
    parent.appendChild(document.createElement('span'));
    parent.appendChild(child);
    parent.appendChild(document.createElement('span'));
    expect(indexPath(root, child)).toEqual([1, 1]);
  });
});
