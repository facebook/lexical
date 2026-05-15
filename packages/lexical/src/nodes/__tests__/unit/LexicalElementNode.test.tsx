/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  $createParagraphNode,
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
import {afterEach, beforeEach, describe, expect, it, test} from 'vitest';

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

  function useLexicalEditor(
    rootElementRef: React.RefObject<null | HTMLDivElement>,
  ) {
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
    test('serializes only the first TextNode style and format', async () => {
      await update(() => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('a').toggleFormat('bold'),
              $createTextNode('b').setStyle('color:green;'),
            ),
          );
      });
      editor.read(() => {
        expect(editor.toJSON().editorState.root.children[0]).toEqual({
          children: [
            {
              detail: 0,
              format: 1,
              mode: 'normal',
              style: '',
              text: 'a',
              type: 'text',
              version: 1,
            },
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: 'color:green;',
              text: 'b',
              type: 'text',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          textFormat: 1,
          textStyle: '',
          type: 'paragraph',
          version: 1,
        });
      });
    });
    test('serializes the same way without a root element', async () => {
      function $initialState() {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('a').toggleFormat('bold'),
              $createTextNode('b').setStyle('color:green;'),
            ),
          );
      }
      await update($initialState);
      const headless = createEditor();
      headless.update($initialState, {discrete: true});
      expect(headless.toJSON()).toEqual(editor.toJSON());
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

    BASE_INSERTIONS.forEach(testCase => {
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

    NESTED_ELEMENTS_TESTS.forEach(testCase => {
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

      const removeTransform = editor.registerNodeTransform(TextNode, node => {
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
        expectedTransforms.forEach(key => {
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
      onError: error => {
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
      `<main dir="auto"><section><span data-lexical-text="true">test text</span></section></main>`,
    );
    editor.update(
      () => {
        wrapper.append($createTextNode('more text').setMode('token'));
      },
      {discrete: true},
    );
    expect(container.innerHTML).toBe(
      `<main dir="auto"><section><span data-lexical-text="true">test text</span><span data-lexical-text="true">more text</span></section></main>`,
    );
    editor.update(
      () => {
        wrapper.clear();
      },
      {discrete: true},
    );
    expect(container.innerHTML).toBe(
      `<main dir="auto"><section><br></section></main>`,
    );
  });

  test('DOM selection uses getDOMSlot element for element selections', () => {
    editor.update(
      () => {
        const wrapper = $createWrapperElementNode().append(
          $createParagraphNode().append($createTextNode('A')),
          $createParagraphNode().append($createTextNode('B')),
          $createParagraphNode().append($createTextNode('C')),
        );
        $getRoot().clear().append(wrapper);
        // Create element-type selection on wrapper
        wrapper.select(0, wrapper.getChildrenSize());
      },
      {discrete: true},
    );

    const domSelection = window.getSelection();
    expect(domSelection!.anchorNode!.nodeName).toBe('SECTION');
    expect(domSelection!.anchorOffset).toBe(0);
    expect(domSelection!.focusNode!.nodeName).toBe('SECTION');
    expect(domSelection!.focusOffset).toBe(3);
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

describe('ElementDOMSlot class', () => {
  function makeElement(): HTMLElement {
    return document.createElement('div');
  }

  test('constructor defaults before/after to null', () => {
    const el = makeElement();
    const slot = new ElementDOMSlot(el);
    expect(slot.element).toBe(el);
    expect(slot.before).toBe(null);
    expect(slot.after).toBe(null);
  });

  test('constructor accepts before and after', () => {
    const el = makeElement();
    const beforeNode = document.createElement('span');
    const afterNode = document.createElement('span');
    el.appendChild(afterNode);
    el.appendChild(beforeNode);
    const slot = new ElementDOMSlot(el, beforeNode, afterNode);
    expect(slot.before).toBe(beforeNode);
    expect(slot.after).toBe(afterNode);
  });

  test('withBefore returns a new slot, preserves after and element', () => {
    const el = makeElement();
    const a = document.createElement('span');
    const b = document.createElement('span');
    el.appendChild(a);
    const original = new ElementDOMSlot(el, null, a);
    const updated = original.withBefore(b);
    expect(updated).not.toBe(original);
    expect(updated.element).toBe(el);
    expect(updated.before).toBe(b);
    expect(updated.after).toBe(a);
    // Original unchanged
    expect(original.before).toBe(null);
  });

  test('withAfter returns a new slot, preserves before and element', () => {
    const el = makeElement();
    const a = document.createElement('span');
    const b = document.createElement('span');
    const original = new ElementDOMSlot(el, a, null);
    const updated = original.withAfter(b);
    expect(updated).not.toBe(original);
    expect(updated.before).toBe(a);
    expect(updated.after).toBe(b);
    expect(original.after).toBe(null);
  });

  test('withElement preserves before / after on the new element', () => {
    const el1 = makeElement();
    const el2 = makeElement();
    const beforeNode = document.createElement('span');
    const afterNode = document.createElement('span');
    const original = new ElementDOMSlot(el1, beforeNode, afterNode);
    const updated = original.withElement(el2);
    expect(updated.element).toBe(el2);
    expect(updated.before).toBe(beforeNode);
    expect(updated.after).toBe(afterNode);
  });

  test('withElement returns same instance when element is unchanged', () => {
    const el = makeElement();
    const original = new ElementDOMSlot(el);
    const updated = original.withElement(el);
    expect(updated).toBe(original);
  });

  test('insertChild appends when before is null', () => {
    const el = makeElement();
    const slot = new ElementDOMSlot(el);
    const child = document.createElement('span');
    slot.insertChild(child);
    expect(el.firstChild).toBe(child);
    expect(el.lastChild).toBe(child);
  });

  test('insertChild inserts before the slot.before node', () => {
    const el = makeElement();
    const trailing = document.createElement('button');
    el.appendChild(trailing);
    const slot = new ElementDOMSlot(el, trailing);
    const child = document.createElement('span');
    slot.insertChild(child);
    expect(el.firstChild).toBe(child);
    expect(el.lastChild).toBe(trailing);
  });

  test('getFirstChild returns null for empty element', () => {
    const el = makeElement();
    const slot = new ElementDOMSlot(el);
    expect(slot.getFirstChild()).toBe(null);
  });

  test('getFirstChild skips past slot.after sibling', () => {
    const el = makeElement();
    const leading = document.createElement('button');
    const lexicalChild = document.createElement('span');
    el.appendChild(leading);
    el.appendChild(lexicalChild);
    const slot = new ElementDOMSlot(el, null, leading);
    expect(slot.getFirstChild()).toBe(lexicalChild);
  });

  test('getFirstChild returns null when only slot.before is present', () => {
    const el = makeElement();
    const trailing = document.createElement('button');
    el.appendChild(trailing);
    const slot = new ElementDOMSlot(el, trailing);
    expect(slot.getFirstChild()).toBe(null);
  });

  test('getFirstChildOffset is 0 with no after', () => {
    const el = makeElement();
    const slot = new ElementDOMSlot(el);
    expect(slot.getFirstChildOffset()).toBe(0);
  });

  test('getFirstChildOffset counts DOM siblings up to and including after', () => {
    const el = makeElement();
    const a = document.createElement('span');
    const b = document.createElement('span');
    const c = document.createElement('span');
    el.appendChild(a);
    el.appendChild(b);
    el.appendChild(c);
    expect(new ElementDOMSlot(el, null, a).getFirstChildOffset()).toBe(1);
    expect(new ElementDOMSlot(el, null, b).getFirstChildOffset()).toBe(2);
    expect(new ElementDOMSlot(el, null, c).getFirstChildOffset()).toBe(3);
  });
});

describe('ElementDOMSlot integration: leading decoration (slot.after)', () => {
  let container: HTMLElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = createEditor({
      nodes: [LeadingDecorElementNode],
      onError: error => {
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

  class LeadingDecorElementNode extends ElementNode {
    static getType() {
      return 'leading-decor';
    }
    static clone(node: LeadingDecorElementNode): LeadingDecorElementNode {
      return new LeadingDecorElementNode(node.__key);
    }
    createDOM() {
      const el = document.createElement('div');
      el.setAttribute('data-block', 'true');
      const marker = document.createElement('span');
      marker.setAttribute('data-marker', 'true');
      marker.contentEditable = 'false';
      marker.textContent = '§';
      el.appendChild(marker);
      return el;
    }
    updateDOM() {
      return false;
    }
    getDOMSlot(dom: HTMLElement): ElementDOMSlot {
      const marker = dom.querySelector('[data-marker]') as HTMLElement;
      return super.getDOMSlot(dom).withAfter(marker);
    }
    exportJSON(): SerializedElementNode {
      throw new Error('Not implemented');
    }
    static importJSON(): LeadingDecorElementNode {
      throw new Error('Not implemented');
    }
  }
  function $createLeadingDecorNode(): LeadingDecorElementNode {
    return $applyNodeReplacement(new LeadingDecorElementNode());
  }

  test('decoration sits in DOM before lexical children', () => {
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createLeadingDecorNode().append($createTextNode('hello')));
      },
      {discrete: true},
    );
    const block = container.querySelector('[data-block]')!;
    const marker = block.querySelector('[data-marker]')!;
    const text = block.querySelector('[data-lexical-text="true"]')!;
    expect(block.firstChild).toBe(marker);
    expect(marker.nextSibling).toBe(text);
    expect(text.textContent).toBe('hello');
  });

  test('appending children keeps the leading decoration first', () => {
    let block: LeadingDecorElementNode;
    editor.update(
      () => {
        block = $createLeadingDecorNode().append(
          $createTextNode('a').setMode('token'),
        );
        $getRoot().clear().append(block);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        block.append($createTextNode('b').setMode('token'));
      },
      {discrete: true},
    );
    const blockDom = container.querySelector('[data-block]')!;
    expect(blockDom.children[0].getAttribute('data-marker')).toBe('true');
    const texts = blockDom.querySelectorAll('[data-lexical-text="true"]');
    expect(Array.from(texts).map(n => n.textContent)).toEqual(['a', 'b']);
  });

  test('clearing children removes lexical content but keeps decoration', () => {
    let block: LeadingDecorElementNode;
    editor.update(
      () => {
        block = $createLeadingDecorNode().append($createTextNode('x'));
        $getRoot().clear().append(block);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        block.clear();
      },
      {discrete: true},
    );
    const blockDom = container.querySelector('[data-block]')!;
    const marker = blockDom.querySelector('[data-marker]');
    expect(marker).not.toBe(null);
    // Empty element gets a managed line break sibling after the marker
    expect(blockDom.querySelector('[data-lexical-text="true"]')).toBe(null);
  });

  test('resolveChildIndex maps DOM offset to lexical index using firstChildOffset', () => {
    // With a leading marker, `slot.getFirstChildOffset()` is 1. A DOM
    // selection landing on `setStart(blockDom, N)` must resolve to lexical
    // child index `N - 1` so `$validatePoint` doesn't reject the point as
    // out-of-range. Without the subtraction in `resolveChildIndex`, an
    // IME-like Range pointing at the second lexical text (DOM offset 2)
    // would resolve to lexical index 2 and crash on validation.
    let block: LeadingDecorElementNode;
    editor.update(
      () => {
        block = $createLeadingDecorNode().append(
          $createTextNode('a').setMode('token'),
          $createTextNode('b').setMode('token'),
        );
        $getRoot().clear().append(block);
      },
      {discrete: true},
    );
    editor.read(() => {
      const blockDom = container.querySelector('[data-block]') as HTMLElement;
      const slot = block.getDOMSlot(blockDom);
      // 2 lexical children + 1 marker prelude → firstChildOffset == 1.
      expect(slot.getFirstChildOffset()).toBe(1);
      // DOM offset 1 (just after marker, before first text) → lexical 0.
      expect(slot.resolveChildIndex(block, blockDom, blockDom, 1)).toEqual([
        block,
        0,
      ]);
      // DOM offset 2 (between the two texts) → lexical 1.
      expect(slot.resolveChildIndex(block, blockDom, blockDom, 2)).toEqual([
        block,
        1,
      ]);
      // DOM offset 3 (after last text) → lexical 2 (= getChildrenSize()).
      expect(slot.resolveChildIndex(block, blockDom, blockDom, 3)).toEqual([
        block,
        2,
      ]);
      // Out-of-range clamp: DOM offset 0 (before marker) clamps up to 0.
      expect(slot.resolveChildIndex(block, blockDom, blockDom, 0)).toEqual([
        block,
        0,
      ]);
      // Out-of-range clamp: DOM offset 99 clamps to children size.
      expect(slot.resolveChildIndex(block, blockDom, blockDom, 99)).toEqual([
        block,
        2,
      ]);
    });
  });
});

describe('ElementDOMSlot integration: trailing decoration (slot.before)', () => {
  let container: HTMLElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = createEditor({
      nodes: [TrailingDecorElementNode],
      onError: error => {
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

  class TrailingDecorElementNode extends ElementNode {
    static getType() {
      return 'trailing-decor';
    }
    static clone(node: TrailingDecorElementNode): TrailingDecorElementNode {
      return new TrailingDecorElementNode(node.__key);
    }
    createDOM() {
      const el = document.createElement('div');
      el.setAttribute('data-block', 'true');
      const marker = document.createElement('span');
      marker.setAttribute('data-marker', 'true');
      marker.contentEditable = 'false';
      marker.textContent = '⋮';
      el.appendChild(marker);
      return el;
    }
    updateDOM() {
      return false;
    }
    getDOMSlot(dom: HTMLElement): ElementDOMSlot {
      const marker = dom.querySelector('[data-marker]') as HTMLElement;
      return super.getDOMSlot(dom).withBefore(marker);
    }
    exportJSON(): SerializedElementNode {
      throw new Error('Not implemented');
    }
    static importJSON(): TrailingDecorElementNode {
      throw new Error('Not implemented');
    }
  }
  function $createTrailingDecorNode(): TrailingDecorElementNode {
    return $applyNodeReplacement(new TrailingDecorElementNode());
  }

  test('decoration sits in DOM after lexical children', () => {
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createTrailingDecorNode().append($createTextNode('hello')));
      },
      {discrete: true},
    );
    const block = container.querySelector('[data-block]')!;
    const marker = block.querySelector('[data-marker]')!;
    const text = block.querySelector('[data-lexical-text="true"]')!;
    expect(text.nextSibling).toBe(marker);
    expect(block.lastChild).toBe(marker);
  });

  test('appending children keeps the trailing decoration last', () => {
    let block: TrailingDecorElementNode;
    editor.update(
      () => {
        block = $createTrailingDecorNode().append(
          $createTextNode('a').setMode('token'),
        );
        $getRoot().clear().append(block);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        block.append($createTextNode('b').setMode('token'));
      },
      {discrete: true},
    );
    const blockDom = container.querySelector('[data-block]')!;
    // Last DOM child stays the marker, lexical children come before it
    expect(
      blockDom.children[blockDom.children.length - 1].getAttribute(
        'data-marker',
      ),
    ).toBe('true');
    const texts = blockDom.querySelectorAll('[data-lexical-text="true"]');
    expect(Array.from(texts).map(n => n.textContent)).toEqual(['a', 'b']);
  });

  test('moving an existing child to the end preserves the trailing decoration', () => {
    let block: TrailingDecorElementNode;
    let firstChild: TextNode;
    editor.update(
      () => {
        firstChild = $createTextNode('first').setMode('token');
        block = $createTrailingDecorNode().append(
          firstChild,
          $createTextNode('second').setMode('token'),
        );
        $getRoot().clear().append(block);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        // Move firstChild to the end of the block
        block.append(firstChild);
      },
      {discrete: true},
    );
    const blockDom = container.querySelector('[data-block]')!;
    const texts = Array.from(
      blockDom.querySelectorAll('[data-lexical-text="true"]'),
    );
    expect(texts.map(n => n.textContent)).toEqual(['second', 'first']);
    expect(blockDom.lastChild!.nodeType).toBe(Node.ELEMENT_NODE);
    expect(
      (blockDom.lastChild as HTMLElement).getAttribute('data-marker'),
    ).toBe('true');
  });

  test('clearing children removes lexical content but keeps decoration', () => {
    let block: TrailingDecorElementNode;
    editor.update(
      () => {
        block = $createTrailingDecorNode().append($createTextNode('x'));
        $getRoot().clear().append(block);
      },
      {discrete: true},
    );
    editor.update(
      () => {
        block.clear();
      },
      {discrete: true},
    );
    const blockDom = container.querySelector('[data-block]')!;
    const marker = blockDom.querySelector('[data-marker]');
    expect(marker).not.toBe(null);
    expect(blockDom.querySelector('[data-lexical-text="true"]')).toBe(null);
  });
});
