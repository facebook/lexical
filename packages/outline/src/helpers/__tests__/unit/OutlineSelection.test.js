/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createEditor} from 'outline';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import useOutlineRichText from 'outline-react/useOutlineRichText';

import {
  insertText,
  sanitizeSelection,
  sanitizeHTML,
  setNativeSelectionWithPaths,
  getNodeFromPath,
  formatBold,
  formatItalic,
  formatUnderline,
  formatStrikeThrough,
  deleteBackward,
  insertParagraph,
  moveNativeSelection,
  deleteForward,
  insertImmutableNode,
  convertToImmutableNode,
  insertSegmentedNode,
  convertToSegmentedNode,
  moveBackward,
  moveForward,
  moveEnd,
  deleteWordBackward,
  deleteWordForward,
  printWhitespace,
  applySelectionInputs,
  undo,
  redo,
  pastePlain,
} from '../utils';

describe('OutlineSelection tests', () => {
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

  function useOutlineEditor(rootElementRef) {
    const editor = React.useMemo(
      () =>
        createEditor({
          theme: {
            placeholder: 'editor-placeholder',
            paragraph: 'editor-paragraph',
            quote: 'editor-quote',
            heading: {
              h1: 'editor-heading-h1',
              h2: 'editor-heading-h2',
              h3: 'editor-heading-h3',
              h4: 'editor-heading-h4',
              h5: 'editor-heading-h5',
            },
            list: {
              ol: 'editor-list-ol',
              ul: 'editor-list-ul',
            },
            listitem: 'editor-listitem',
            image: 'editor-image',
            text: {
              bold: 'editor-text-bold',
              link: 'editor-text-link',
              italic: 'editor-text-italic',
              overflowed: 'editor-text-overflowed',
              hashtag: 'editor-text-hashtag',
              underline: 'editor-text-underline',
              strikethrough: 'editor-text-strikethrough',
              underlineStrikethrough: 'editor-text-underlineStrikethrough',
              code: 'editor-text-code',
            },
            code: 'editor-code',
          },
        }),
      [],
    );

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
      const props = useOutlineRichText(editor, false);
      return <div ref={ref} contentEditable={true} {...props} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.createRoot(container).render(<TestBase />);
    });
    ref.current.focus();
    await Promise.resolve().then();
    // Focus first element
    setNativeSelectionWithPaths(ref.current, [0, 0, 0], 0, [0, 0, 0], 0);
  }

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  test('Expect initial output to be a block with some text', () => {
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"><br></span></p></div>',
    );
  });

  function assertSelection(rootElement, expectedSelection) {
    const acutalSelection = sanitizeSelection(window.getSelection());
    expect(acutalSelection.anchorNode).toBe(
      getNodeFromPath(expectedSelection.anchorPath, rootElement),
    );
    expect(acutalSelection.anchorOffset).toBe(expectedSelection.anchorOffset);
    expect(acutalSelection.focusNode).toBe(
      getNodeFromPath(expectedSelection.focusPath, rootElement),
    );
    expect(acutalSelection.focusOffset).toBe(expectedSelection.focusOffset);
  }

  // eslint-disable-next-line no-unused-vars
  const GRAPHEME_SCENARIOS = [
    {
      description: 'grapheme cluster',
      // Hangul grapheme cluster.
      // https://www.compart.com/en/unicode/U+AC01
      grapheme: '\u1100\u1161\u11A8',
    },
    {
      description: 'extended grapheme cluster',
      // Tamil 'ni' grapheme cluster.
      // http://unicode.org/reports/tr29/#Table_Sample_Grapheme_Clusters
      grapheme: '\u0BA8\u0BBF',
    },
    {
      description: 'tailored grapheme cluster',
      // Devangari 'kshi' tailored grapheme cluster.
      // http://unicode.org/reports/tr29/#Table_Sample_Grapheme_Clusters
      grapheme: '\u0915\u094D\u0937\u093F',
    },
    {
      description: 'Emoji sequence combined using zero-width joiners',
      // https://emojipedia.org/family-woman-woman-girl-boy/
      grapheme:
        '\uD83D\uDC69\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66',
    },
    {
      description: 'Emoji sequence with skin-tone modifier',
      // https://emojipedia.org/clapping-hands-medium-skin-tone/
      grapheme: '\uD83D\uDC4F\uD83C\uDFFD',
    },
  ];

  const suite = [
    {
      name: 'Simple typing',
      inputs: [
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Simple typing in bold',
      inputs: [
        formatBold(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<strong class="editor-text-bold" data-outline-text="true">Hello</strong></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Simple typing in italic',
      inputs: [
        formatItalic(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<em class="editor-text-italic" data-outline-text="true">Hello</em></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Simple typing in italic + bold',
      inputs: [
        formatItalic(),
        formatBold(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<strong class="editor-text-bold editor-text-italic" data-outline-text="true">Hello</strong></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Simple typing in underline',
      inputs: [
        formatUnderline(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span data-outline-text="true" class="editor-text-underline">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Simple typing in strikethrough',
      inputs: [
        formatStrikeThrough(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span data-outline-text="true" class="editor-text-strikethrough">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Simple typing in underline + strikethrough',
      inputs: [
        formatUnderline(),
        formatStrikeThrough(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span data-outline-text="true" class="editor-text-underlineStrikethrough">Hello</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Deletion',
      inputs: [
        insertText('1'),
        insertText('2'),
        insertText('3'),
        deleteBackward(),
        insertText('4'),
        insertText('5'),
        deleteBackward(),
        insertText('6'),
        deleteForward(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true">1246</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 4,
        focusPath: [0, 0, 0],
        focusOffset: 4,
      },
    },
    {
      name: 'Creation of an immutable node',
      inputs: [insertImmutableNode('Dominic Gannaway')],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"></span>' +
        '<span data-outline-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorPath: [0],
        anchorOffset: 2,
        focusPath: [0],
        focusOffset: 2,
      },
    },
    {
      name: 'Convert text to an immutable node',
      inputs: [
        insertText('Dominic Gannaway'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 16),
        convertToImmutableNode(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"></span>' +
        '<span data-outline-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorPath: [0],
        anchorOffset: 2,
        focusPath: [0],
        focusOffset: 2,
      },
    },
    {
      name: 'Deletion of an immutable node',
      inputs: [insertImmutableNode('Dominic Gannaway'), deleteBackward()],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
    },
    {
      name: 'Creation of a segmented node',
      inputs: [insertSegmentedNode('Dominic Gannaway')],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"></span>' +
        '<span data-outline-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorPath: [0],
        anchorOffset: 2,
        focusPath: [0],
        focusOffset: 2,
      },
    },
    {
      name: 'Convert text to a segmented node',
      inputs: [
        insertText('Dominic Gannaway'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 16),
        convertToSegmentedNode(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"></span>' +
        '<span data-outline-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorPath: [0],
        anchorOffset: 2,
        focusPath: [0],
        focusOffset: 2,
      },
    },
    {
      name: 'Deletion of part of a segmented node',
      inputs: [insertSegmentedNode('Dominic Gannaway'), deleteBackward()],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true"></span>' +
        '<span data-outline-text="true">Dominic</span>' +
        '</p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 7,
        focusPath: [0, 1, 0],
        focusOffset: 7,
      },
    },
    {
      name: 'Should correctly handle empty paragraph blocks when moving backward',
      inputs: [insertParagraph(), moveBackward()],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"><br></span></p>' +
        '<p class="editor-paragraph"><span data-outline-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
    },
    {
      name: 'Should correctly handle empty paragraph blocks when moving forward',
      inputs: [
        insertParagraph(),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
        moveForward(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"><br></span></p>' +
        '<p class="editor-paragraph"><span data-outline-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      },
    },
    // Tests need fixing:

    // ...GRAPHEME_SCENARIOS.flatMap(({description, grapheme}) => [
    //   {
    //     name: `Delete backward eliminates entire ${description} (${grapheme})`,
    //     inputs: [insertText(grapheme + grapheme), deleteBackward()],
    //     expectedHTML: `<div contenteditable="true" data-outline-editor="true"><p dir=\"ltr\"><span>${grapheme}</span></p></div>`,
    //     expectedSelection: {
    //       anchorPath: [0, 0, 0],
    //       anchorOffset: grapheme.length,
    //       focusPath: [0, 0, 0],
    //       focusOffset: grapheme.length,
    //     },
    //     setup: emptySetup,
    //   },
    //   {
    //     name: `Delete forward eliminates entire ${description} (${grapheme})`,
    //     inputs: [
    //       insertText(grapheme + grapheme),
    //       moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
    //       deleteForward(),
    //     ],
    //     expectedHTML: `<div contenteditable="true" data-outline-editor="true"><p dir=\"ltr\"><span>${grapheme}</span></p></div>`,
    //     expectedSelection: {
    //       anchorPath: [0, 0, 0],
    //       anchorOffset: 0,
    //       focusPath: [0, 0, 0],
    //       focusOffset: 0,
    //     },
    //     setup: emptySetup,
    //   },
    //   {
    //     name: `Move backward skips over grapheme cluster (${grapheme})`,
    //     inputs: [insertText(grapheme + grapheme), moveBackward()],
    //     expectedHTML: `<div contenteditable="true" data-outline-editor="true"><p dir=\"ltr\"><span>${grapheme}${grapheme}</span></p></div>`,
    //     expectedSelection: {
    //       anchorPath: [0, 0, 0],
    //       anchorOffset: grapheme.length,
    //       focusPath: [0, 0, 0],
    //       focusOffset: grapheme.length,
    //     },
    //     setup: emptySetup,
    //   },
    //   {
    //     name: `Move forward skips over grapheme cluster (${grapheme})`,
    //     inputs: [
    //       insertText(grapheme + grapheme),
    //       moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
    //       moveForward(),
    //     ],
    //     expectedHTML: `<div contenteditable="true" data-outline-editor="true"><p dir=\"ltr\"><span>${grapheme}${grapheme}</span></p></div>`,
    //     expectedSelection: {
    //       anchorPath: [0, 0, 0],
    //       anchorOffset: grapheme.length,
    //       focusPath: [0, 0, 0],
    //       focusOffset: grapheme.length,
    //     },
    //     setup: emptySetup,
    //   },
    // ]),
    {
      name: 'Jump to beginning and insert',
      inputs: [
        insertText('1'),
        insertText('1'),
        insertText('2'),
        insertText('3'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
        insertText('a'),
        insertText('b'),
        insertText('c'),
        deleteForward(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">abc123</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      },
    },
    {
      name: 'Select and replace',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        insertText('outline'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello outline!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 13,
        focusPath: [0, 0, 0],
        focusOffset: 13,
      },
    },
    {
      name: 'Select and bold',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatBold(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span>' +
        '<strong class="editor-text-bold" data-outline-text="true">draft</strong><span data-outline-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Select and italic',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatItalic(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span>' +
        '<em class="editor-text-italic" data-outline-text="true">draft</em><span data-outline-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Select and bold + italic',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatBold(),
        formatItalic(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span>' +
        '<strong class="editor-text-bold editor-text-italic" data-outline-text="true">draft</strong><span data-outline-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Select and underline',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatUnderline(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span>' +
        '<span class="editor-text-underline" data-outline-text="true">draft</span><span data-outline-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Select and strikethrough',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatStrikeThrough(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span>' +
        '<span class="editor-text-strikethrough" data-outline-text="true">draft</span><span data-outline-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Select and underline + strikethrough',
      inputs: [
        insertText('Hello draft!'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
        formatUnderline(),
        formatStrikeThrough(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span>' +
        '<span class="editor-text-underlineStrikethrough" data-outline-text="true">draft</span><span data-outline-text="true">!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      },
    },
    {
      name: 'Select and replace all',
      inputs: [
        insertText('This is broken.'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 15),
        insertText('This works!'),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">This works!</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 11,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      },
    },
    {
      name: 'Select and delete',
      inputs: [
        insertText('A lion.'),
        moveNativeSelection([0, 0, 0], 2, [0, 0, 0], 6),
        deleteForward(),
        insertText('duck'),
        moveNativeSelection([0, 0, 0], 2, [0, 0, 0], 6),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">A duck.</span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      },
    },
    {
      name: 'Inserting a paragraph',
      inputs: [insertParagraph()],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"><br></span></p>' +
        '<p class="editor-paragraph"><span data-outline-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      },
    },
    {
      name: 'Inserting a paragraph and then removing it',
      inputs: [insertParagraph(), deleteBackward()],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
    },
    {
      name: 'Inserting a paragraph part way through text',
      inputs: [
        insertText('Hello world'),
        moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 6),
        insertParagraph(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span></p>' +
        '<p class="editor-paragraph" dir="ltr"><span data-outline-text="true">world</span></p></div>',
      expectedSelection: {
        anchorPath: [1, 0, 0],
        anchorOffset: 0,
        focusPath: [1, 0, 0],
        focusOffset: 0,
      },
    },
    {
      name: 'Inserting two paragraphs and then deleting via selection',
      inputs: [
        insertText('123'),
        insertParagraph(),
        insertText('456'),
        moveNativeSelection([0, 0, 0], 0, [1, 0, 0], 3),
        deleteBackward(),
      ],
      expectedHTML:
        '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true"><br></span></p></div>',
      expectedSelection: {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      },
    },
    ...[
      {whitespaceCharacter: ' ', whitespaceName: 'space'},
      {whitespaceCharacter: '\u00a0', whitespaceName: 'non-breaking space'},
      {whitespaceCharacter: '\u2000', whitespaceName: 'en quad'},
      {whitespaceCharacter: '\u2001', whitespaceName: 'em quad'},
      {whitespaceCharacter: '\u2002', whitespaceName: 'en space'},
      {whitespaceCharacter: '\u2003', whitespaceName: 'em space'},
      {whitespaceCharacter: '\u2004', whitespaceName: 'three-per-em space'},
      {whitespaceCharacter: '\u2005', whitespaceName: 'four-per-em space'},
      {whitespaceCharacter: '\u2006', whitespaceName: 'six-per-em space'},
      {whitespaceCharacter: '\u2007', whitespaceName: 'figure space'},
      {whitespaceCharacter: '\u2008', whitespaceName: 'punctuation space'},
      {whitespaceCharacter: '\u2009', whitespaceName: 'thin space'},
      {whitespaceCharacter: '\u200A', whitespaceName: 'hair space'},
    ].flatMap(({whitespaceCharacter, whitespaceName}) => [
      {
        name: `Type two words separated by a ${whitespaceName}, delete word backward from end`,
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          deleteWordBackward(),
        ],
        expectedHTML: `<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello${printWhitespace(
          whitespaceCharacter,
        )}</span></p></div>`,
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        },
      },
      {
        name: `Type two words separated by a ${whitespaceName}, delete word forward from beginning`,
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
          deleteWordForward(),
        ],
        expectedHTML: `<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">${printWhitespace(
          whitespaceCharacter,
        )}world</span></p></div>`,
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        },
      },
      {
        name: `Type two words separated by a ${whitespaceName}, delete word forward from beginning of preceding whitespace`,
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          moveNativeSelection([0, 0, 0], 5, [0, 0, 0], 5),
          deleteWordForward(),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello</span></p></div>',
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 5,
          focusPath: [0, 0, 0],
          focusOffset: 5,
        },
      },
      {
        name: `Type two words separated by a ${whitespaceName}, delete word backward from end of trailing whitespace`,
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 6),
          deleteWordBackward(),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">world</span></p></div>',
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        },
      },
      {
        name: `Type a word, delete it and undo the deletion`,
        inputs: [insertText('Hello world'), deleteWordBackward(), undo()],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello world</span></p></div>',
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 11,
          focusPath: [0, 0, 0],
          focusOffset: 11,
        },
      },
      {
        name: `Type a word, delete it and undo the deletion`,
        inputs: [
          insertText('Hello world'),
          deleteWordBackward(),
          undo(),
          redo(),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">Hello </span></p></div>',
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        },
      },
      {
        name: 'Type a sentence, move the caret to the middle and move with the arrows to the start',
        inputs: [
          insertText('this is weird test'),
          moveNativeSelection([0, 0, 0], 14, [0, 0, 0], 14),
          moveBackward(14),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
          '<span data-outline-text="true">this is weird test</span></p></div>',
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        },
      },
      {
        name: 'Type a text and an immutable text, move the caret to the end of the first text',
        inputs: [
          insertText('Hello '),
          insertImmutableNode('Bob'),
          moveBackward(),
          moveBackward(),
          moveEnd(),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr">' +
          '<span data-outline-text="true">Hello </span>' +
          '<span data-outline-text="true">Bob</span>' +
          '</p></div>',
        expectedSelection: {
          anchorPath: [0, 1, 0],
          anchorOffset: 3,
          focusPath: [0, 1, 0],
          focusOffset: 3,
        },
      },
      {
        name: 'Paste text, move selection and delete word forward',
        inputs: [
          pastePlain('ABD	EFG'),
          moveBackward(5),
          insertText('C'),
          moveBackward(),
          deleteWordForward(),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph" dir="ltr"><span data-outline-text="true">AB\tEFG</span></p></div>',
        expectedSelection: {
          anchorPath: [0, 0, 0],
          anchorOffset: 2,
          focusPath: [0, 0, 0],
          focusOffset: 2,
        },
      },
    ]),
  ];

  suite.forEach((testUnit, i) => {
    const name = testUnit.name || 'Test case';
    test(name + ` (#${i + 1})`, async () => {
      await applySelectionInputs(testUnit.inputs, update, editor);
      // Validate HTML matches
      expect(sanitizeHTML(container.innerHTML)).toBe(testUnit.expectedHTML);
      // Validate selection matches
      const rootElement = editor.getRootElement();
      const expectedSelection = testUnit.expectedSelection;
      assertSelection(rootElement, expectedSelection);
    });
  });
});
