/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {State} from 'outline';

import {
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_CODE,
} from '../../core/OutlineConstants';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {createEditor, createTextNode, TextNode} from 'outline';

import {createParagraphNode} from 'outline/ParagraphNode';
import {
  getCompositionKey,
  getEditorStateTextContent,
  setCompositionKey,
} from '../../core/OutlineUtils';

const editorConfig = Object.freeze({
  theme: {
    text: {
      bold: 'my-bold-class',
      underline: 'my-underline-class',
      strikethrough: 'my-strikethrough-class',
      underlineStrikethrough: 'my-underline-strikethrough-class',
      italic: 'my-italic-class',
      code: 'my-code-class',
    },
  },
});

class CustomSegmentedNode extends TextNode {
  static clone(node: $FlowFixMe): CustomSegmentedNode {
    return new CustomSegmentedNode(node.__text, node.__key);
  }
}

function createCustomSegmentedNode(text): CustomSegmentedNode {
  return new CustomSegmentedNode(text).makeSegmented();
}

describe('OutlineTextNode tests', () => {
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
    await update((state) => {
      const paragraph = createParagraphNode();
      const text = createTextNode();
      text.toggleUnmergeable();
      paragraph.append(text);
      state.getRoot().append(paragraph);
    });
  }

  describe('root.getTextContent()', () => {
    test('writable nodes', async () => {
      let nodeKey;

      await update((state) => {
        const textNode = createTextNode('Text');
        nodeKey = textNode.getKey();
        expect(textNode.getTextContent()).toBe('Text');
        expect(textNode.getTextContent(true)).toBe('Text');
        expect(textNode.__text).toBe('Text');

        state.getRoot().getFirstChild().append(textNode);
      });
      expect(
        editor.getEditorState().read((state: State) => {
          const root = state.getRoot();
          return root.__cachedText;
        }),
      );
      expect(getEditorStateTextContent(editor.getEditorState())).toBe('Text');

      // Make sure that the editor content is still set after further reconciliations
      await update((state) => {
        state.getNodeByKey(nodeKey).markDirty();
      });
      expect(getEditorStateTextContent(editor.getEditorState())).toBe('Text');
    });

    test('inert nodes', async () => {
      let nodeKey;

      await update((state) => {
        const textNode = createTextNode('Inert text').makeInert();
        nodeKey = textNode.getKey();
        expect(textNode.getTextContent()).toBe('');
        expect(textNode.getTextContent(true)).toBe('Inert text');
        expect(textNode.__text).toBe('Inert text');

        state.getRoot().getFirstChild().append(textNode);
      });

      expect(getEditorStateTextContent(editor.getEditorState())).toBe('');

      // Make sure that the editor content is still empty after further reconciliations
      await update((state) => {
        state.getNodeByKey(nodeKey).markDirty();
      });
      expect(getEditorStateTextContent(editor.getEditorState())).toBe('');
    });

    test('prepend node', async () => {
      await update((state) => {
        const textNode = createTextNode('World').toggleUnmergeable();
        state.getRoot().getFirstChild().append(textNode);
      });

      await update((state) => {
        const textNode = createTextNode('Hello ').toggleUnmergeable();
        const previousTextNode = state
          .getRoot()
          .getFirstChild()
          .getFirstChild();
        previousTextNode.insertBefore(textNode);
      });

      expect(getEditorStateTextContent(editor.getEditorState())).toBe(
        'Hello World',
      );
    });
  });

  describe('setTextContent()', () => {
    test('writable nodes', async () => {
      await update(() => {
        const textNode = createTextNode('My new text node');
        textNode.setTextContent('My newer text node');

        expect(textNode.getTextContent()).toBe('My newer text node');
      });
    });

    test('immutable nodes', async () => {
      await update(() => {
        const textNode = createTextNode('My new text node');
        textNode.makeImmutable();

        expect(() => {
          textNode.setTextContent('My newer text node');
        }).toThrow();
        expect(textNode.getTextContent()).toBe('My new text node');
      });
    });

    test('inert nodes', async () => {
      await update(() => {
        const textNode = createTextNode('My inert text node');
        textNode.makeInert();

        expect(textNode.getTextContent()).toBe('');
        expect(textNode.getTextContent(true)).toBe('My inert text node');
      });
    });
  });

  describe.each([
    ['bold', IS_BOLD, (node) => node.isBold(), (node) => node.toggleBold()],
    [
      'italic',
      IS_ITALIC,
      (node) => node.isItalic(),
      (node) => node.toggleItalics(),
    ],
    [
      'strikethrough',
      IS_STRIKETHROUGH,
      (node) => node.isStrikethrough(),
      (node) => node.toggleStrikethrough(),
    ],
    [
      'underline',
      IS_UNDERLINE,
      (node) => node.isUnderline(),
      (node) => node.toggleUnderline(),
    ],
    ['code', IS_CODE, (node) => node.isCode(), (node) => node.toggleCode()],
  ])('%s flag', (formatFlag, stateFormat, flagPredicate, flagToggle) => {
    test(`getTextNodeFormatFlags(${formatFlag})`, async () => {
      await update((state) => {
        const root = state.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        const newFormat = textNode.getTextNodeFormat(formatFlag, null);
        expect(newFormat).toBe(stateFormat);

        textNode.setFormat(newFormat);
        const newFormat2 = textNode.getTextNodeFormat(formatFlag, null);
        expect(newFormat2).toBe(0);
      });
    });

    test(`predicate for ${formatFlag}`, async () => {
      await update((state) => {
        const root = state.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        textNode.setFormat(stateFormat);
        expect(flagPredicate(textNode)).toBe(true);
      });
    });

    test(`toggling for ${formatFlag}`, async () => {
      // Toggle method hasn't been implemented for this flag.
      if (flagToggle === null) {
        return;
      }

      await update((state) => {
        const root = state.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        expect(flagPredicate(textNode)).toBe(false);
        flagToggle(textNode);
        expect(flagPredicate(textNode)).toBe(true);
        flagToggle(textNode);
        expect(flagPredicate(textNode)).toBe(false);
      });
    });
  });

  test('selectPrevious()', async () => {
    await update((state) => {
      const paragraphNode = createParagraphNode();
      const textNode = createTextNode('Hello World');
      const textNode2 = createTextNode('Goodbye Earth');

      paragraphNode.append(textNode, textNode2);
      state.getRoot().append(paragraphNode);

      let selection = textNode2.selectPrevious();

      expect(selection.anchor.getNode()).toBe(textNode);
      expect(selection.anchor.offset).toBe(11);
      expect(selection.focus.getNode()).toBe(textNode);
      expect(selection.focus.offset).toBe(11);

      selection = textNode.selectPrevious();
      expect(selection.anchor.getNode()).toBe(paragraphNode);
      expect(selection.anchor.offset).toBe(0);
    });
  });

  test('selectNext()', async () => {
    await update((state) => {
      const paragraphNode = createParagraphNode();
      const textNode = createTextNode('Hello World');
      const textNode2 = createTextNode('Goodbye Earth');

      paragraphNode.append(textNode, textNode2);
      state.getRoot().append(paragraphNode);

      let selection = textNode.selectNext(1, 3);

      expect(selection.anchor.getNode()).toBe(textNode2);
      expect(selection.anchor.offset).toBe(1);
      expect(selection.focus.getNode()).toBe(textNode2);
      expect(selection.focus.offset).toBe(3);

      selection = textNode2.selectNext();
      expect(selection.anchor.getNode()).toBe(paragraphNode);
      expect(selection.anchor.offset).toBe(2);
    });
  });

  describe('select()', () => {
    test.each([
      [
        [2, 4],
        [2, 4],
      ],
      [
        [4, 2],
        [4, 2],
      ],
      [
        [undefined, 2],
        [11, 2],
      ],
      [
        [2, undefined],
        [2, 11],
      ],
      [
        [undefined, undefined],
        [11, 11],
      ],
    ])(
      'select(...%p)',
      async (
        [anchorOffset, focusOffset],
        [expectedAnchorOffset, expectedFocusOffset],
      ) => {
        await update((state) => {
          const paragraphNode = createParagraphNode();
          const textNode = createTextNode('Hello World');
          paragraphNode.append(textNode);
          state.getRoot().append(paragraphNode);

          const selection = textNode.select(anchorOffset, focusOffset);

          expect(selection.focus.getNode()).toBe(textNode);
          expect(selection.anchor.offset).toBe(expectedAnchorOffset);
          expect(selection.focus.getNode()).toBe(textNode);
          expect(selection.focus.offset).toBe(expectedFocusOffset);
        });
      },
    );
  });

  describe('splitText()', () => {
    test('throw when immutable', async () => {
      await update(() => {
        const textNode = createTextNode('Hello World');
        textNode.makeImmutable();

        expect(() => {
          textNode.splitText(3);
        }).toThrow();
      });
    });

    test('convert segmented node into plain text', async () => {
      await update((state) => {
        const segmentedNode = createCustomSegmentedNode('Hello World');
        const paragraphNode = createParagraphNode();
        paragraphNode.append(segmentedNode);

        const [middle, next] = segmentedNode.splitText(5);

        const children = paragraphNode.getAllTextNodes();
        expect(paragraphNode.getTextContent()).toBe('Hello World');
        expect(children[0].isSimpleText()).toBe(true);
        expect(children[0].getTextContent()).toBe('Hello');
        expect(middle).toBe(children[0]);
        expect(next).toBe(children[1]);
      });
    });

    test.each([
      ['a', [], ['a']],
      ['a', [1], ['a']],
      ['a', [5], ['a']],
      ['Hello World', [], ['Hello World']],
      ['Hello World', [3], ['Hel', 'lo World']],
      ['Hello World', [3, 3], ['Hel', 'lo World']],
      ['Hello World', [3, 7], ['Hel', 'lo W', 'orld']],
      ['Hello World', [7, 3], ['Hel', 'lo W', 'orld']],
      ['Hello World', [3, 7, 99], ['Hel', 'lo W', 'orld']],
    ])(
      '"%s" splitText(...%p)',
      async (initialString, splitOffsets, splitStrings) => {
        await update((state) => {
          const paragraphNode = createParagraphNode();
          const textNode = createTextNode(initialString);
          paragraphNode.append(textNode);

          const splitNodes = textNode.splitText(...splitOffsets);

          expect(paragraphNode.getChildren()).toHaveLength(splitStrings.length);
          expect(splitNodes.map((node) => node.getTextContent())).toEqual(
            splitStrings,
          );
        });
      },
    );

    test('splitText moves composition key to last node', async () => {
      await update((state) => {
        const paragraphNode = createParagraphNode();
        const textNode = createTextNode('12345');
        paragraphNode.append(textNode);
        setCompositionKey(textNode.getKey());

        const [, splitNode2] = textNode.splitText(1);
        expect(getCompositionKey()).toBe(splitNode2.getKey());
      });
    });

    test.each([
      [
        'Hello',
        [4],
        [3, 3],
        {
          anchorNodeIndex: 0,
          anchorOffset: 3,
          focusNodeIndex: 0,
          focusOffset: 3,
        },
      ],
      [
        'Hello',
        [4],
        [5, 5],
        {
          anchorNodeIndex: 1,
          anchorOffset: 1,
          focusNodeIndex: 1,
          focusOffset: 1,
        },
      ],
      [
        'Hello World',
        [4],
        [2, 7],
        {
          anchorNodeIndex: 0,
          anchorOffset: 2,
          focusNodeIndex: 1,
          focusOffset: 3,
        },
      ],
      [
        'Hello World',
        [4],
        [2, 4],
        {
          anchorNodeIndex: 0,
          anchorOffset: 2,
          focusNodeIndex: 0,
          focusOffset: 4,
        },
      ],
      [
        'Hello World',
        [4],
        [7, 2],
        {
          anchorNodeIndex: 1,
          anchorOffset: 3,
          focusNodeIndex: 0,
          focusOffset: 2,
        },
      ],
      [
        'Hello World',
        [4, 6],
        [2, 9],
        {
          anchorNodeIndex: 0,
          anchorOffset: 2,
          focusNodeIndex: 2,
          focusOffset: 3,
        },
      ],
      [
        'Hello World',
        [4, 6],
        [9, 2],
        {
          anchorNodeIndex: 2,
          anchorOffset: 3,
          focusNodeIndex: 0,
          focusOffset: 2,
        },
      ],
      [
        'Hello World',
        [4, 6],
        [9, 9],
        {
          anchorNodeIndex: 2,
          anchorOffset: 3,
          focusNodeIndex: 2,
          focusOffset: 3,
        },
      ],
    ])(
      '"%s" splitText(...%p) with select(...%p)',
      async (
        initialString,
        splitOffsets,
        selectionOffsets,
        {anchorNodeIndex, anchorOffset, focusNodeIndex, focusOffset},
      ) => {
        await update((state) => {
          const paragraphNode = createParagraphNode();
          const textNode = createTextNode(initialString);
          paragraphNode.append(textNode);
          state.getRoot().append(paragraphNode);

          const selection = textNode.select(...selectionOffsets);
          const childrenNodes = textNode.splitText(...splitOffsets);

          expect(selection.anchor.getNode()).toBe(
            childrenNodes[anchorNodeIndex],
          );
          expect(selection.anchor.offset).toBe(anchorOffset);
          expect(selection.focus.getNode()).toBe(childrenNodes[focusNodeIndex]);
          expect(selection.focus.offset).toBe(focusOffset);
        });
      },
    );
  });

  describe('createDOM()', () => {
    test.each([
      ['no formatting', null, 'My text node', '<span>My text node</span>'],
      [
        'bold',
        IS_BOLD,
        'My text node',
        '<strong class="my-bold-class">My text node</strong>',
      ],
      ['bold + empty', IS_BOLD, '', `<strong class="my-bold-class"></strong>`],
      [
        'underline',
        IS_UNDERLINE,
        'My text node',
        '<span class="my-underline-class">My text node</span>',
      ],
      [
        'strikethrough',
        IS_STRIKETHROUGH,
        'My text node',
        '<span class="my-strikethrough-class">My text node</span>',
      ],
      [
        'italic',
        IS_ITALIC,
        'My text node',
        '<em class="my-italic-class">My text node</em>',
      ],
      [
        'code',
        IS_CODE,
        'My text node',
        '<code><span class="my-code-class">My text node</span></code>',
      ],
      [
        'underline + strikethrough',
        IS_UNDERLINE | IS_STRIKETHROUGH,
        'My text node',
        '<span class="my-underline-strikethrough-class">' +
          'My text node</span>',
      ],
      [
        'code + italic',
        IS_CODE | IS_ITALIC,
        'My text node',
        '<code><em class="my-italic-class my-code-class">My text node' +
          '</em></code>',
      ],
      [
        'code + underline + strikethrough',
        IS_CODE | IS_UNDERLINE | IS_STRIKETHROUGH,
        'My text node',
        '<code><span class="my-underline-strikethrough-class my-code-class">' +
          'My text node</span></code>',
      ],
      [
        'code + underline + strikethrough + bold + italic',
        IS_CODE | IS_UNDERLINE | IS_STRIKETHROUGH | IS_BOLD | IS_ITALIC,
        'My text node',
        '<code><strong class="my-underline-strikethrough-class my-bold-class ' +
          'my-italic-class my-code-class">' +
          'My text node</strong></code>',
      ],
    ])('%s text format type', async (_type, format, contents, expectedHTML) => {
      await update(() => {
        const textNode = createTextNode(contents);
        textNode.setFormat(format);
        const element = textNode.createDOM(editorConfig);
        expect(element.outerHTML).toBe(expectedHTML);
      });
    });

    describe('has parent node', () => {
      test.each([
        ['no formatting', null, 'My text node', '<span>My text node</span>'],
        ['no formatting + empty string', null, '', `<span></span>`],
      ])(
        '%s text format type',
        async (_type, format, contents, expectedHTML) => {
          await update(() => {
            const paragraphNode = createParagraphNode();
            const textNode = createTextNode(contents);
            textNode.setFormat(format);
            paragraphNode.append(textNode);

            const element = textNode.createDOM(editorConfig);
            expect(element.outerHTML).toBe(expectedHTML);
          });
        },
      );
    });
  });

  describe('updateDOM()', () => {
    test.each([
      [
        'different tags',
        {
          text: 'My text node',
          flags: 0,
          format: IS_BOLD,
        },
        {
          text: 'My text node',
          flags: 0,
          format: IS_ITALIC,
        },
        {
          result: true,
          expectedHTML: null,
        },
      ],
      [
        'no change in tags',
        {
          text: 'My text node',
          flags: 0,
          format: IS_BOLD,
        },
        {
          text: 'My text node',
          flags: 0,
          format: IS_BOLD,
        },
        {
          result: false,
          expectedHTML: '<strong class="my-bold-class">My text node</strong>',
        },
      ],
      [
        'change in text',
        {
          text: 'My text node',
          flags: 0,
          format: IS_BOLD,
        },
        {
          text: 'My new text node',
          flags: 0,
          format: IS_BOLD,
        },
        {
          result: false,
          expectedHTML:
            '<strong class="my-bold-class">My new text node</strong>',
        },
      ],
      [
        'removing code block',
        {
          text: 'My text node',
          flags: 0,
          format: IS_CODE | IS_BOLD,
        },
        {
          text: 'My new text node',
          flags: 0,
          format: IS_BOLD,
        },
        {
          result: true,
          expectedHTML: null,
        },
      ],
    ])(
      '%s',
      async (
        _desc,
        {text: prevText, flags: prevFlags, format: prevFormat},
        {text: nextText, flags: nextFlags, format: nextFormat},
        {result, expectedHTML},
      ) => {
        await update(() => {
          const prevTextNode = createTextNode(prevText);
          prevTextNode.setFlags(prevFlags);
          prevTextNode.setFormat(prevFormat);
          const element = prevTextNode.createDOM(editorConfig);

          const textNode = createTextNode(nextText);
          textNode.setFlags(nextFlags);
          textNode.setFormat(nextFormat);

          expect(textNode.updateDOM(prevTextNode, element, editorConfig)).toBe(
            result,
          );
          // Only need to bother about DOM element contents if updateDOM()
          // returns false.
          if (!result) {
            expect(element.outerHTML).toBe(expectedHTML);
          }
        });
      },
    );
  });
});
