import {
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_CODE,
  IS_LINK,
  IS_HASHTAG,
  IS_OVERFLOWED,
} from '../OutlineConstants';

let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;
let ParagraphNodeModule;

describe('OutlineTextNode tests', () => {
  beforeEach(async () => {
    React = require('react');
    ReactDOM = require('react-dom');
    ReactTestUtils = require('react-dom/test-utils');
    Outline = require('outline');
    ParagraphNodeModule = require('outline-extensions/ParagraphNode');

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
      const paragraph = ParagraphNodeModule.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
  }

  test('getTextContent()', async () => {
    await update(() => {
      const textNode = Outline.createTextNode('My new text node');

      expect(textNode.getTextContent()).toBe('My new text node');
    });
  });

  test('getTextContent() (inert)', async () => {
    await update(() => {
      const textNode = Outline.createTextNode('My inert text node');
      textNode.makeInert();

      expect(textNode.getTextContent()).toBe('');
      expect(textNode.getTextContent(true)).toBe('My inert text node');
    });
  });

  describe.each([
    [
      'bold',
      IS_BOLD,
      (node) => node.isBold(),
      null, // Toggle not implemented.
    ],
    [
      'italic',
      IS_ITALIC,
      (node) => node.isItalic(),
      null, // Toggle not implemented.
    ],
    [
      'strikethrough',
      IS_STRIKETHROUGH,
      (node) => node.isStrikethrough(),
      null, // Toggle not implemented.
    ],
    [
      'underline',
      IS_UNDERLINE,
      (node) => node.isUnderline(),
      null, // Toggle not implemented.
    ],
    [
      'code',
      IS_CODE,
      (node) => node.isCode(),
      null, // Toggle not implemented.
    ],
    [
      'link',
      IS_LINK,
      (node) => node.isLink(),
      null, // Toggle not implemented.
    ],
    [
      'hashtag',
      IS_HASHTAG,
      (node) => node.isHashtag(),
      (node) => node.toggleHashtag(),
    ],
    [
      'overflowed',
      IS_OVERFLOWED,
      (node) => node.isOverflowed(),
      (node) => node.toggleOverflowed(),
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

  test('selectEnd()', async () => {
    await update((view) => {
      const paragraphNode = ParagraphNodeModule.createParagraphNode();
      const textNode = Outline.createTextNode('Hello World');
      paragraphNode.append(textNode);
      view.getRoot().append(paragraphNode);

      const selection = textNode.selectEnd();

      expect(selection.getAnchorNode()).toBe(textNode);
      expect(selection.anchorOffset).toBe(11);
      expect(selection.getFocusNode()).toBe(textNode);
      expect(selection.focusOffset).toBe(11);
    });
  });

  test('selectNext()', async () => {
    await update((view) => {
      const paragraphNode = ParagraphNodeModule.createParagraphNode();
      const textNode = Outline.createTextNode('Hello World');
      const textNode2 = Outline.createTextNode('Goodbye Earth');

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
    ])(
      'select(...%p)',
      async (
        [anchorOffset, focusOffset],
        [expectedAnchorOffset, expectedFocusOffset],
      ) => {
        await update((view) => {
          const paragraphNode = ParagraphNodeModule.createParagraphNode();
          const textNode = Outline.createTextNode('Hello World');
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
        const textNode = Outline.createTextNode('Hello world');
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
          const paragraphNode = ParagraphNodeModule.createParagraphNode();
          const textNode = Outline.createTextNode(initialString);
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
          const paragraphNode = ParagraphNodeModule.createParagraphNode();
          const textNode = Outline.createTextNode(initialString);
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
});
