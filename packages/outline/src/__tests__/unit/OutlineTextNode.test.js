/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_CODE,
  IS_OVERFLOWED,
  IS_UNMERGEABLE,
} from '../../core/OutlineConstants';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {createEditor, createTextNode} from 'outline';

import {createParagraphNode} from 'outline/ParagraphNode';

const editorThemeClasses = Object.freeze({
  text: {
    bold: 'my-bold-class',
    underline: 'my-underline-class',
    strikethrough: 'my-strikethrough-class',
    underlineStrikethrough: 'my-underline-strikethrough-class',
    italic: 'my-italic-class',
    code: 'my-code-class',
    overflowed: 'my-overflowed-class',
  },
});

function sanitizeHTML(html) {
  // Remove zero width characters.
  return html.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
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
      ReactDOM.render(<TestBase />, container);
    });

    // Insert initial block
    await update((view) => {
      const paragraph = createParagraphNode();
      const text = createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
  }

  describe('getTextContent()', () => {
    test('writable nodes', async () => {
      let nodeKey;

      await update((view) => {
        const textNode = createTextNode('Text');
        nodeKey = textNode.getKey();
        expect(textNode.getTextContent()).toBe('Text');
        expect(textNode.getTextContent(true)).toBe('Text');
        expect(textNode.__text).toBe('Text');

        view.getRoot().getFirstChild().append(textNode);
      });

      expect(editor.getTextContent()).toBe('Text');

      // Make sure that the editor content is still set after further reconciliations
      await update((view) => {
        view.markNodeAsDirty(view.getNodeByKey(nodeKey));
      });
      expect(editor.getTextContent()).toBe('Text');
    });

    test('inert nodes', async () => {
      let nodeKey;

      await update((view) => {
        const textNode = createTextNode('Inert text').makeInert();
        nodeKey = textNode.getKey();
        expect(textNode.getTextContent()).toBe('');
        expect(textNode.getTextContent(true)).toBe('Inert text');
        expect(textNode.__text).toBe('Inert text');

        view.getRoot().getFirstChild().append(textNode);
      });

      expect(editor.getTextContent()).toBe('');

      // Make sure that the editor content is still empty after further reconciliations
      await update((view) => {
        view.markNodeAsDirty(view.getNodeByKey(nodeKey));
      });
      expect(editor.getTextContent()).toBe('');
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
    [
      'overflowed',
      IS_OVERFLOWED,
      (node) => node.isOverflowed(),
      (node) => node.toggleOverflowed(),
    ],
    [
      'unmergeable',
      IS_UNMERGEABLE,
      (node) => node.isUnmergeable(),
      (node) => node.toggleUnmergeable(),
    ],
  ])('%s flag', (formatFlag, stateFlag, flagPredicate, flagToggle) => {
    test(`getTextNodeFormatFlags(${formatFlag})`, async () => {
      await update((view) => {
        const root = view.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        const newFlags = textNode.getTextNodeFormatFlags(formatFlag, null);
        expect(newFlags).toBe(stateFlag);

        textNode.setFlags(newFlags);
        const newFlags2 = textNode.getTextNodeFormatFlags(formatFlag, null);
        expect(newFlags2).toBe(0);
      });
    });

    test(`predicate for ${formatFlag}`, async () => {
      await update((view) => {
        const root = view.getRoot();
        const paragraphNode = root.getFirstChild();
        const textNode = paragraphNode.getFirstChild();

        textNode.setFlags(stateFlag);
        expect(flagPredicate(textNode)).toBe(true);
      });
    });

    test(`toggling for ${formatFlag}`, async () => {
      // Toggle method hasn't been implemented for this flag.
      if (flagToggle === null) {
        return;
      }

      await update((view) => {
        const root = view.getRoot();
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

  test('selectNext()', async () => {
    await update((view) => {
      const paragraphNode = createParagraphNode();
      const textNode = createTextNode('Hello World');
      const textNode2 = createTextNode('Goodbye Earth');

      paragraphNode.append(textNode);
      paragraphNode.append(textNode2);
      view.getRoot().append(paragraphNode);

      const selection = textNode.selectNext(1, 3);

      expect(selection.getAnchorNode()).toBe(textNode2);
      expect(selection.anchorOffset).toBe(1);
      expect(selection.getFocusNode()).toBe(textNode2);
      expect(selection.focusOffset).toBe(3);

      expect(() => {
        textNode2.selectNext(1, 3);
      }).toThrow();
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
        await update((view) => {
          const paragraphNode = createParagraphNode();
          const textNode = createTextNode('Hello World');
          paragraphNode.append(textNode);
          view.getRoot().append(paragraphNode);

          const selection = textNode.select(anchorOffset, focusOffset);

          expect(selection.getAnchorNode()).toBe(textNode);
          expect(selection.anchorOffset).toBe(expectedAnchorOffset);
          expect(selection.getFocusNode()).toBe(textNode);
          expect(selection.focusOffset).toBe(expectedFocusOffset);
        });
      },
    );
  });

  describe('splitText()', () => {
    test('throw when immutable', async () => {
      await update(() => {
        const textNode = createTextNode('Hello world');
        textNode.makeImmutable();

        expect(() => {
          textNode.splitText(3);
        }).toThrow();
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
        await update((view) => {
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
        await update((view) => {
          const paragraphNode = createParagraphNode();
          const textNode = createTextNode(initialString);
          paragraphNode.append(textNode);
          view.getRoot().append(paragraphNode);

          const selection = textNode.select(...selectionOffsets);
          const childrenNodes = textNode.splitText(...splitOffsets);

          expect(selection.getAnchorNode()).toBe(
            childrenNodes[anchorNodeIndex],
          );
          expect(selection.anchorOffset).toBe(anchorOffset);
          expect(selection.getFocusNode()).toBe(childrenNodes[focusNodeIndex]);
          expect(selection.focusOffset).toBe(focusOffset);
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
        'overflowed',
        IS_OVERFLOWED,
        'My text node',
        '<span class="my-overflowed-class">My text node</span>',
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
    ])('%s text format type', async (_type, flag, contents, expectedHTML) => {
      await update(() => {
        const textNode = createTextNode(contents);
        textNode.setFlags(flag);
        const element = textNode.createDOM(editorThemeClasses);
        expect(sanitizeHTML(element.outerHTML)).toBe(expectedHTML);
      });
    });

    describe('has parent node', () => {
      test.each([
        ['no formatting', null, 'My text node', '<span>My text node</span>'],
        ['no formatting + empty string', null, '', `<span><br></span>`],
      ])('%s text format type', async (_type, flag, contents, expectedHTML) => {
        await update(() => {
          const paragraphNode = createParagraphNode();
          const textNode = createTextNode(contents);
          textNode.setFlags(flag);
          paragraphNode.append(textNode);

          const element = textNode.createDOM(editorThemeClasses);
          expect(sanitizeHTML(element.outerHTML)).toBe(expectedHTML);
        });
      });
    });
  });

  describe('updateDOM()', () => {
    test.each([
      [
        'different tags',
        {
          text: 'My text node',
          flags: IS_BOLD,
        },
        {
          text: 'My text node',
          flags: IS_ITALIC,
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
          flags: IS_BOLD,
        },
        {
          text: 'My text node',
          flags: IS_BOLD,
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
          flags: IS_BOLD,
        },
        {
          text: 'My new text node',
          flags: IS_BOLD,
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
          flags: IS_CODE | IS_BOLD,
        },
        {
          text: 'My new text node',
          flags: IS_BOLD,
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
        {text: prevText, flags: prevFlags},
        {text: nextText, flags: nextFlags},
        {result, expectedHTML},
      ) => {
        await update(() => {
          const prevTextNode = createTextNode(prevText);
          prevTextNode.setFlags(prevFlags);
          const element = prevTextNode.createDOM(editorThemeClasses);

          const textNode = createTextNode(nextText);
          textNode.setFlags(nextFlags);

          expect(
            textNode.updateDOM(prevTextNode, element, editorThemeClasses),
          ).toBe(result);
          // Only need to bother about DOM element contents if updateDOM()
          // returns false.
          if (!result) {
            expect(sanitizeHTML(element.outerHTML)).toBe(expectedHTML);
          }
        });
      },
    );
  });
});
