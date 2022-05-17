/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/src/LexicalComposerContext';
import LexicalContentEditable from '@lexical/react/src/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/src/LexicalHistoryPlugin';
import RichTextPlugin from '@lexical/react/src/LexicalRichTextPlugin';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  Selection,
} from 'lexical';
import {
  $createTestDecoratorNode,
  $createTestElementNode,
  createTestEditor,
  TestComposer,
} from 'lexical/src/__tests__/utils';
import React from 'react';
import {createRoot} from 'react-dom/client';
import ReactTestUtils from 'react-dom/test-utils';

import {
  applySelectionInputs,
  convertToImmutableNode,
  convertToSegmentedNode,
  deleteBackward,
  deleteWordBackward,
  deleteWordForward,
  formatBold,
  formatItalic,
  formatStrikeThrough,
  formatUnderline,
  getNodeFromPath,
  insertImmutableNode,
  insertSegmentedNode,
  insertText,
  moveBackward,
  moveEnd,
  moveNativeSelection,
  pastePlain,
  printWhitespace,
  redo,
  setAnchorPoint,
  setFocusPoint,
  setNativeSelectionWithPaths,
  undo,
} from '../utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('shared/environment', () => {
  const originalModule = jest.requireActual('shared/environment');

  return {
    ...originalModule,
    IS_FIREFOX: true,
  };
});

describe('LexicalSelection tests', () => {
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

  let editor = null;

  async function init() {
    function TestBase() {
      function TestPlugin() {
        [editor] = useLexicalComposerContext();
      }

      return (
        <TestComposer
          config={{
            theme: {
              code: 'editor-code',
              heading: {
                h1: 'editor-heading-h1',
                h2: 'editor-heading-h2',
                h3: 'editor-heading-h3',
                h4: 'editor-heading-h4',
                h5: 'editor-heading-h5',
              },
              image: 'editor-image',
              list: {
                ol: 'editor-list-ol',
                ul: 'editor-list-ul',
              },
              listitem: 'editor-listitem',
              paragraph: 'editor-paragraph',
              placeholder: 'editor-placeholder',
              quote: 'editor-quote',
              text: {
                bold: 'editor-text-bold',
                code: 'editor-text-code',
                hashtag: 'editor-text-hashtag',
                italic: 'editor-text-italic',
                link: 'editor-text-link',
                strikethrough: 'editor-text-strikethrough',
                underline: 'editor-text-underline',
                underlineStrikethrough: 'editor-text-underlineStrikethrough',
              },
            },
          }}>
          <RichTextPlugin
            contentEditable={
              // eslint-disable-next-line jsx-a11y/aria-role
              <LexicalContentEditable role={null} spellCheck={null} />
            }
          />
          <HistoryPlugin />
          <TestPlugin />
        </TestComposer>
      );
    }

    ReactTestUtils.act(() => {
      createRoot(container).render(<TestBase />);
    });
    editor.getRootElement().focus();
    await Promise.resolve().then();
    // Focus first element
    setNativeSelectionWithPaths(editor.getRootElement(), [0, 0], 0, [0, 0], 0);
  }

  async function update(fn) {
    await ReactTestUtils.act(async () => {
      await editor.update(fn);
    });
    return Promise.resolve().then();
  }

  test('Expect initial output to be a block with no text', () => {
    expect(container.innerHTML).toBe(
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph"><br></p></div>',
    );
  });

  function assertSelection(rootElement, expectedSelection) {
    const actualSelection = window.getSelection();
    expect(actualSelection.anchorNode).toBe(
      getNodeFromPath(expectedSelection.anchorPath, rootElement),
    );
    expect(actualSelection.anchorOffset).toBe(expectedSelection.anchorOffset);
    expect(actualSelection.focusNode).toBe(
      getNodeFromPath(expectedSelection.focusPath, rootElement),
    );
    expect(actualSelection.focusOffset).toBe(expectedSelection.focusOffset);
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
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello</span></p></div>',
      expectedSelection: {
        anchorOffset: 5,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 0, 0],
      },
      inputs: [
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      name: 'Simple typing',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<strong class="editor-text-bold" data-lexical-text="true">Hello</strong></p></div>',
      expectedSelection: {
        anchorOffset: 5,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 0, 0],
      },
      inputs: [
        formatBold(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      name: 'Simple typing in bold',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<em class="editor-text-italic" data-lexical-text="true">Hello</em></p></div>',
      expectedSelection: {
        anchorOffset: 5,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 0, 0],
      },
      inputs: [
        formatItalic(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      name: 'Simple typing in italic',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<strong class="editor-text-bold editor-text-italic" data-lexical-text="true">Hello</strong></p></div>',
      expectedSelection: {
        anchorOffset: 5,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 0, 0],
      },
      inputs: [
        formatItalic(),
        formatBold(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      name: 'Simple typing in italic + bold',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span class="editor-text-underline" data-lexical-text="true">Hello</span></p></div>',
      expectedSelection: {
        anchorOffset: 5,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 0, 0],
      },
      inputs: [
        formatUnderline(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      name: 'Simple typing in underline',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span class="editor-text-strikethrough" data-lexical-text="true">Hello</span></p></div>',
      expectedSelection: {
        anchorOffset: 5,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 0, 0],
      },
      inputs: [
        formatStrikeThrough(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      name: 'Simple typing in strikethrough',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span class="editor-text-underlineStrikethrough" data-lexical-text="true">Hello</span></p></div>',
      expectedSelection: {
        anchorOffset: 5,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 0, 0],
      },
      inputs: [
        formatUnderline(),
        formatStrikeThrough(),
        insertText('H'),
        insertText('e'),
        insertText('l'),
        insertText('l'),
        insertText('o'),
      ],
      name: 'Simple typing in underline + strikethrough',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph"><span data-lexical-text="true">1246</span></p></div>',
      expectedSelection: {
        anchorOffset: 4,
        anchorPath: [0, 0, 0],
        focusOffset: 4,
        focusPath: [0, 0, 0],
      },
      inputs: [
        insertText('1'),
        insertText('2'),
        insertText('3'),
        deleteBackward(),
        insertText('4'),
        insertText('5'),
        deleteBackward(),
        insertText('6'),
      ],
      name: 'Deletion',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span data-lexical-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorOffset: 16,
        anchorPath: [0, 0, 0],
        focusOffset: 16,
        focusPath: [0, 0, 0],
      },
      inputs: [insertImmutableNode('Dominic Gannaway')],
      name: 'Creation of an immutable node',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span data-lexical-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorOffset: 1,
        anchorPath: [0],
        focusOffset: 1,
        focusPath: [0],
      },
      inputs: [
        insertText('Dominic Gannaway'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 16),
        convertToImmutableNode(),
      ],
      name: 'Convert text to an immutable node',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span data-lexical-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorOffset: 1,
        anchorPath: [0],
        focusOffset: 1,
        focusPath: [0],
      },
      inputs: [insertSegmentedNode('Dominic Gannaway')],
      name: 'Creation of a segmented node',
    },
    {
      expectedHTML:
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
        '<span data-lexical-text="true">Dominic Gannaway</span>' +
        '</p></div>',
      expectedSelection: {
        anchorOffset: 1,
        anchorPath: [0],
        focusOffset: 1,
        focusPath: [0],
      },
      inputs: [
        insertText('Dominic Gannaway'),
        moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 16),
        convertToSegmentedNode(),
      ],
      name: 'Convert text to a segmented node',
    },
    // Tests need fixing:

    // ...GRAPHEME_SCENARIOS.flatMap(({description, grapheme}) => [
    //   {
    //     name: `Delete backward eliminates entire ${description} (${grapheme})`,
    //     inputs: [insertText(grapheme + grapheme), deleteBackward()],
    //     expectedHTML: `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir=\"ltr\"><span>${grapheme}</span></p></div>`,
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
    //     expectedHTML: `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir=\"ltr\"><span>${grapheme}</span></p></div>`,
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
    //     expectedHTML: `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir=\"ltr\"><span>${grapheme}${grapheme}</span></p></div>`,
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
    //     expectedHTML: `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir=\"ltr\"><span>${grapheme}${grapheme}</span></p></div>`,
    //     expectedSelection: {
    //       anchorPath: [0, 0, 0],
    //       anchorOffset: grapheme.length,
    //       focusPath: [0, 0, 0],
    //       focusOffset: grapheme.length,
    //     },
    //     setup: emptySetup,
    //   },
    // ]),
    // {
    //   name: 'Jump to beginning and insert',
    //   inputs: [
    //     insertText('1'),
    //     insertText('1'),
    //     insertText('2'),
    //     insertText('3'),
    //     moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
    //     insertText('a'),
    //     insertText('b'),
    //     insertText('c'),
    //     deleteForward(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">abc123</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 0, 0],
    //     anchorOffset: 3,
    //     focusPath: [0, 0, 0],
    //     focusOffset: 3,
    //   },
    // },
    // {
    //   name: 'Select and replace',
    //   inputs: [
    //     insertText('Hello draft!'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
    //     insertText('lexical'),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello lexical!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 0, 0],
    //     anchorOffset: 13,
    //     focusPath: [0, 0, 0],
    //     focusOffset: 13,
    //   },
    // },
    // {
    //   name: 'Select and bold',
    //   inputs: [
    //     insertText('Hello draft!'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
    //     formatBold(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span>' +
    //     '<strong class="editor-text-bold" data-lexical-text="true">draft</strong><span data-lexical-text="true">!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 1, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 1, 0],
    //     focusOffset: 5,
    //   },
    // },
    // {
    //   name: 'Select and italic',
    //   inputs: [
    //     insertText('Hello draft!'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
    //     formatItalic(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span>' +
    //     '<em class="editor-text-italic" data-lexical-text="true">draft</em><span data-lexical-text="true">!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 1, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 1, 0],
    //     focusOffset: 5,
    //   },
    // },
    // {
    //   name: 'Select and bold + italic',
    //   inputs: [
    //     insertText('Hello draft!'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
    //     formatBold(),
    //     formatItalic(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span>' +
    //     '<strong class="editor-text-bold editor-text-italic" data-lexical-text="true">draft</strong><span data-lexical-text="true">!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 1, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 1, 0],
    //     focusOffset: 5,
    //   },
    // },
    // {
    //   name: 'Select and underline',
    //   inputs: [
    //     insertText('Hello draft!'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
    //     formatUnderline(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span>' +
    //     '<span class="editor-text-underline" data-lexical-text="true">draft</span><span data-lexical-text="true">!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 1, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 1, 0],
    //     focusOffset: 5,
    //   },
    // },
    // {
    //   name: 'Select and strikethrough',
    //   inputs: [
    //     insertText('Hello draft!'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
    //     formatStrikeThrough(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span>' +
    //     '<span class="editor-text-strikethrough" data-lexical-text="true">draft</span><span data-lexical-text="true">!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 1, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 1, 0],
    //     focusOffset: 5,
    //   },
    // },
    // {
    //   name: 'Select and underline + strikethrough',
    //   inputs: [
    //     insertText('Hello draft!'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 11),
    //     formatUnderline(),
    //     formatStrikeThrough(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span>' +
    //     '<span class="editor-text-underlineStrikethrough" data-lexical-text="true">draft</span><span data-lexical-text="true">!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 1, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 1, 0],
    //     focusOffset: 5,
    //   },
    // },
    // {
    //   name: 'Select and replace all',
    //   inputs: [
    //     insertText('This is broken.'),
    //     moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 15),
    //     insertText('This works!'),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 0, 0],
    //     anchorOffset: 11,
    //     focusPath: [0, 0, 0],
    //     focusOffset: 11,
    //   },
    // },
    // {
    //   name: 'Select and delete',
    //   inputs: [
    //     insertText('A lion.'),
    //     moveNativeSelection([0, 0, 0], 2, [0, 0, 0], 6),
    //     deleteForward(),
    //     insertText('duck'),
    //     moveNativeSelection([0, 0, 0], 2, [0, 0, 0], 6),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">A duck.</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 0, 0],
    //     anchorOffset: 2,
    //     focusPath: [0, 0, 0],
    //     focusOffset: 6,
    //   },
    // },
    // {
    //   name: 'Inserting a paragraph',
    //   inputs: [insertParagraph()],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph"><span data-lexical-text="true"><br></span></p>' +
    //     '<p class="editor-paragraph"><span data-lexical-text="true"><br></span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [1, 0, 0],
    //     anchorOffset: 0,
    //     focusPath: [1, 0, 0],
    //     focusOffset: 0,
    //   },
    // },
    // {
    //   name: 'Inserting a paragraph and then removing it',
    //   inputs: [insertParagraph(), deleteBackward()],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph"><span data-lexical-text="true"><br></span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 0, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 0, 0],
    //     focusOffset: 0,
    //   },
    // },
    // {
    //   name: 'Inserting a paragraph part way through text',
    //   inputs: [
    //     insertText('Hello world'),
    //     moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 6),
    //     insertParagraph(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span></p>' +
    //     '<p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">world</span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [1, 0, 0],
    //     anchorOffset: 0,
    //     focusPath: [1, 0, 0],
    //     focusOffset: 0,
    //   },
    // },
    // {
    //   name: 'Inserting two paragraphs and then deleting via selection',
    //   inputs: [
    //     insertText('123'),
    //     insertParagraph(),
    //     insertText('456'),
    //     moveNativeSelection([0, 0, 0], 0, [1, 0, 0], 3),
    //     deleteBackward(),
    //   ],
    //   expectedHTML:
    //     '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph"><span data-lexical-text="true"><br></span></p></div>',
    //   expectedSelection: {
    //     anchorPath: [0, 0, 0],
    //     anchorOffset: 0,
    //     focusPath: [0, 0, 0],
    //     focusOffset: 0,
    //   },
    // },
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
        expectedHTML: `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello${printWhitespace(
          whitespaceCharacter,
        )}</span></p></div>`,
        expectedSelection: {
          anchorOffset: 6,
          anchorPath: [0, 0, 0],
          focusOffset: 6,
          focusPath: [0, 0, 0],
        },
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          deleteWordBackward(),
        ],
        name: `Type two words separated by a ${whitespaceName}, delete word backward from end`,
      },
      {
        expectedHTML: `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">${printWhitespace(
          whitespaceCharacter,
        )}world</span></p></div>`,
        expectedSelection: {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        },
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          moveNativeSelection([0, 0, 0], 0, [0, 0, 0], 0),
          deleteWordForward(),
        ],
        name: `Type two words separated by a ${whitespaceName}, delete word forward from beginning`,
      },
      {
        expectedHTML:
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello</span></p></div>',
        expectedSelection: {
          anchorOffset: 5,
          anchorPath: [0, 0, 0],
          focusOffset: 5,
          focusPath: [0, 0, 0],
        },
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          moveNativeSelection([0, 0, 0], 5, [0, 0, 0], 5),
          deleteWordForward(),
        ],
        name: `Type two words separated by a ${whitespaceName}, delete word forward from beginning of preceding whitespace`,
      },
      {
        expectedHTML:
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">world</span></p></div>',
        expectedSelection: {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        },
        inputs: [
          insertText(`Hello${whitespaceCharacter}world`),
          moveNativeSelection([0, 0, 0], 6, [0, 0, 0], 6),
          deleteWordBackward(),
        ],
        name: `Type two words separated by a ${whitespaceName}, delete word backward from end of trailing whitespace`,
      },
      {
        expectedHTML:
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello world</span></p></div>',
        expectedSelection: {
          anchorOffset: 11,
          anchorPath: [0, 0, 0],
          focusOffset: 11,
          focusPath: [0, 0, 0],
        },
        inputs: [insertText('Hello world'), deleteWordBackward(), undo()],
        name: `Type a word, delete it and undo the deletion`,
      },
      {
        expectedHTML:
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello </span></p></div>',
        expectedSelection: {
          anchorOffset: 6,
          anchorPath: [0, 0, 0],
          focusOffset: 6,
          focusPath: [0, 0, 0],
        },
        inputs: [
          insertText('Hello world'),
          deleteWordBackward(),
          undo(),
          redo(),
        ],
        name: `Type a word, delete it and undo the deletion`,
      },
      {
        expectedHTML:
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
          '<span data-lexical-text="true">this is weird test</span></p></div>',
        expectedSelection: {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 0,
          focusPath: [0, 0, 0],
        },
        inputs: [
          insertText('this is weird test'),
          moveNativeSelection([0, 0, 0], 14, [0, 0, 0], 14),
          moveBackward(14),
        ],
        name: 'Type a sentence, move the caret to the middle and move with the arrows to the start',
      },
      {
        expectedHTML:
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr">' +
          '<span data-lexical-text="true">Hello </span>' +
          '<span data-lexical-text="true">Bob</span>' +
          '</p></div>',
        expectedSelection: {
          anchorOffset: 3,
          anchorPath: [0, 1, 0],
          focusOffset: 3,
          focusPath: [0, 1, 0],
        },
        inputs: [
          insertText('Hello '),
          insertImmutableNode('Bob'),
          moveBackward(),
          moveBackward(),
          moveEnd(),
        ],
        name: 'Type a text and an immutable text, move the caret to the end of the first text',
      },
      {
        expectedHTML:
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">AB\tEFG</span></p></div>',
        expectedSelection: {
          anchorOffset: 2,
          anchorPath: [0, 0, 0],
          focusOffset: 2,
          focusPath: [0, 0, 0],
        },
        inputs: [
          pastePlain('ABD	EFG'),
          moveBackward(5),
          insertText('C'),
          moveBackward(),
          deleteWordForward(),
        ],
        name: 'Paste text, move selection and delete word forward',
      },
    ]),
  ];

  suite.forEach((testUnit, i) => {
    const name = testUnit.name || 'Test case';
    test(name + ` (#${i + 1})`, async () => {
      await applySelectionInputs(testUnit.inputs, update, editor);
      // Validate HTML matches
      expect(container.innerHTML).toBe(testUnit.expectedHTML);
      // Validate selection matches
      const rootElement = editor.getRootElement();
      const expectedSelection = testUnit.expectedSelection;
      assertSelection(rootElement, expectedSelection);
    });
  });

  test('getNodes resolves nested block nodes', async () => {
    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const elementNode = $createTestElementNode();
        const text = $createTextNode();
        paragraph.append(elementNode);
        elementNode.append(text);

        const selectedNodes = $getSelection().getNodes();
        expect(selectedNodes.length).toBe(1);
        expect(selectedNodes[0].getKey()).toBe(text.getKey());
      });
    });
  });

  describe('Block selection moves when new nodes are inserted', () => {
    [
      // Collapsed selection on end; add/remove/replace beginning
      {
        anchorOffset: 2,
        fn: (paragraph, text) => {
          const newText = $createTextNode('2');
          text.insertBefore(newText);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 3,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        focusOffset: 2,
        name: 'insertBefore - Collapsed selection on end; add beginning',
      },
      {
        anchorOffset: 2,
        fn: (paragraph, text) => {
          const newText = $createTextNode('2');
          text.insertAfter(newText);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 3,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        focusOffset: 2,
        name: 'insertAfter - Collapsed selection on end; add beginning',
      },
      {
        anchorOffset: 2,
        fn: (paragraph, text) => {
          text.splitText(1);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 3,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        focusOffset: 2,
        name: 'splitText - Collapsed selection on end; add beginning',
      },
      {
        anchorOffset: 1,
        fn: (paragraph, text) => {
          text.remove();

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 0,
          };
        },
        focusOffset: 1,
        name: 'remove - Collapsed selection on end; add beginning',
      },
      {
        anchorOffset: 1,
        fn: (paragraph, text) => {
          const newText = $createTextNode('replacement');
          text.replace(newText);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 1,
            expectedFocus: paragraph,
            expectedFocusOffset: 1,
          };
        },
        focusOffset: 1,
        name: 'replace - Collapsed selection on end; replace beginning',
      },
      // All selected; add/remove/replace on beginning
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          const newText = $createTextNode('2');
          text.insertBefore(newText);

          return {
            expectedAnchor: text,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        focusOffset: 2,
        name: 'insertBefore - All selected; add on beginning',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText) => {
          const [, text] = originalText.splitText(1);

          return {
            expectedAnchor: text,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        focusOffset: 2,
        name: 'splitNodes - All selected; add on beginning',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          text.remove();

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 0,
          };
        },
        focusOffset: 1,
        name: 'remove - All selected; remove on beginning',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          const newText = $createTextNode('replacement');
          text.replace(newText);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 1,
          };
        },
        focusOffset: 1,
        name: 'replace - All selected; replace on beginning',
      },
      // Selection beginning; add/remove/replace on end
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = originalText1.getPreviousSibling();
          const lastChild = paragraph.getLastChild();
          const newText = $createTextNode('2');
          lastChild.insertBefore(newText);

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 0,
            expectedFocus: originalText1,
            expectedFocusOffset: 0,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 1,
        name: 'insertBefore - Selection beginning; add on end',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          const lastChild = paragraph.getLastChild();
          const newText = $createTextNode('2');
          lastChild.insertAfter(newText);

          return {
            expectedAnchor: text,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 1,
          };
        },
        focusOffset: 1,
        name: 'insertAfter - Selection beginning; add on end',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = originalText1.getPreviousSibling();
          const [, text] = originalText1.splitText(1);

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 0,
            expectedFocus: text,
            expectedFocusOffset: 0,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 1,
        name: 'splitText - Selection beginning; add on end',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          const lastChild = paragraph.getLastChild();
          lastChild.remove();

          return {
            expectedAnchor: text,
            expectedAnchorOffset: 0,
            expectedFocus: text,
            expectedFocusOffset: 0,
          };
        },
        focusOffset: 1,
        name: 'remove - Selection beginning; remove on end',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          const newText = $createTextNode('replacement');
          const lastChild = paragraph.getLastChild();
          lastChild.replace(newText);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 1,
          };
        },
        focusOffset: 1,
        name: 'replace - Selection beginning; replace on end',
      },
      // All selected; add/remove/replace in end offset [1, 2] -> [1, N, 2]
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          const lastChild = paragraph.getLastChild();
          const newText = $createTextNode('2');
          lastChild.insertBefore(newText);

          return {
            expectedAnchor: text,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 2,
          };
        },
        focusOffset: 1,
        name: 'insertBefore - All selected; add in end offset',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, text) => {
          const newText = $createTextNode('2');
          text.insertAfter(newText);

          return {
            expectedAnchor: text,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 2,
          };
        },
        focusOffset: 1,
        name: 'insertAfter - All selected; add in end offset',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = originalText1.getPreviousSibling();
          const [, text] = originalText1.splitText(1);

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 0,
            expectedFocus: text,
            expectedFocusOffset: 0,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 1,
        name: 'splitText - All selected; add in end offset',
      },
      {
        anchorOffset: 1,
        fn: (paragraph, originalText1) => {
          const lastChild = paragraph.getLastChild();
          lastChild.remove();

          return {
            expectedAnchor: originalText1,
            expectedAnchorOffset: 0,
            expectedFocus: originalText1,
            expectedFocusOffset: 0,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 2,
        name: 'remove - All selected; remove in end offset',
      },
      {
        anchorOffset: 1,
        fn: (paragraph, originalText1) => {
          const newText = $createTextNode('replacement');
          const lastChild = paragraph.getLastChild();
          lastChild.replace(newText);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 1,
            expectedFocus: paragraph,
            expectedFocusOffset: 2,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 2,
        name: 'replace - All selected; replace in end offset',
      },
      // All selected; add/remove/replace in middle [1, 2, 3] -> [1, 2, N, 3]
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = originalText1.getPreviousSibling();
          const lastChild = paragraph.getLastChild();
          const newText = $createTextNode('2');
          lastChild.insertBefore(newText);

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 2,
        name: 'insertBefore - All selected; add in middle',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = originalText1.getPreviousSibling();
          const newText = $createTextNode('2');
          originalText1.insertAfter(newText);

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 2,
        name: 'insertAfter - All selected; add in middle',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = originalText1.getPreviousSibling();
          originalText1.splitText(1);

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 3,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 2,
        name: 'splitText - All selected; add in middle',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = originalText1.getPreviousSibling();
          originalText1.remove();

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 1,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 2,
        name: 'remove - All selected; remove in middle',
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const newText = $createTextNode('replacement');
          originalText1.replace(newText);

          return {
            expectedAnchor: paragraph,
            expectedAnchorOffset: 0,
            expectedFocus: paragraph,
            expectedFocusOffset: 2,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          originalText1.insertBefore(originalText2);
        },
        focusOffset: 2,
        name: 'replace - All selected; replace in middle',
      },
      // Edge cases
      {
        anchorOffset: 3,
        fn: (paragraph, originalText1) => {
          const originalText2 = paragraph.getLastChild();
          const newText = $createTextNode('new');
          originalText1.insertBefore(newText);

          return {
            expectedAnchor: originalText2,
            expectedAnchorOffset: 'bar'.length,
            expectedFocus: originalText2,
            expectedFocusOffset: 'bar'.length,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          paragraph.append(originalText2);
        },
        focusOffset: 3,
        name: "Selection resolves to the end of text node when it's at the end (1)",
      },
      {
        anchorOffset: 0,
        fn: (paragraph, originalText1) => {
          const originalText2 = paragraph.getLastChild();
          const newText = $createTextNode('new');
          originalText1.insertBefore(newText);

          return {
            expectedAnchor: originalText1,
            expectedAnchorOffset: 0,
            expectedFocus: originalText2,
            expectedFocusOffset: 'bar'.length,
          };
        },
        fnBefore: (paragraph, originalText1) => {
          const originalText2 = $createTextNode('bar');
          paragraph.append(originalText2);
        },
        focusOffset: 3,
        name: "Selection resolves to the end of text node when it's at the end (2)",
      },
    ]
      .reduce((testSuite, testCase) => {
        // Test inverse selection
        const inverse = {
          ...testCase,
          anchorOffset: testCase.focusOffset,
          focusOffset: testCase.anchorOffset,
          invertSelection: true,
          name: testCase.name + ' (inverse selection)',
        };
        return testSuite.concat(testCase, inverse);
      }, [])
      .forEach(
        ({
          name,
          fn,
          fnBefore = () => {},
          anchorOffset,
          focusOffset,
          invertSelection,
          only,
        }) => {
          // eslint-disable-next-line no-only-tests/no-only-tests
          const test_ = only === true ? test.only : test;
          test_(name, async () => {
            await ReactTestUtils.act(async () => {
              await editor.update(() => {
                const root = $getRoot();
                const paragraph = root.getFirstChild();
                const textNode = $createTextNode('foo');
                // Note: line break can't be selected by the DOM
                const linebreak = $createLineBreakNode();
                const selection: Selection = $getSelection();
                const anchor = selection.anchor;
                const focus = selection.focus;

                paragraph.append(textNode, linebreak);

                fnBefore(paragraph, textNode);

                anchor.set(paragraph.getKey(), anchorOffset, 'block');
                focus.set(paragraph.getKey(), focusOffset, 'block');

                const {
                  expectedAnchor,
                  expectedAnchorOffset,
                  expectedFocus,
                  expectedFocusOffset,
                } = fn(paragraph, textNode);

                if (invertSelection !== true) {
                  expect(selection.anchor.key).toBe(expectedAnchor.__key);
                  expect(selection.anchor.offset).toBe(expectedAnchorOffset);
                  expect(selection.focus.key).toBe(expectedFocus.__key);
                  expect(selection.focus.offset).toBe(expectedFocusOffset);
                } else {
                  expect(selection.anchor.key).toBe(expectedFocus.__key);
                  expect(selection.anchor.offset).toBe(expectedFocusOffset);
                  expect(selection.focus.key).toBe(expectedAnchor.__key);
                  expect(selection.focus.offset).toBe(expectedAnchorOffset);
                }
              });
            });
          });
        },
      );
  });

  describe('Selection correctly resolves to a sibling ElementNode when a node is removed', () => {
    test('', async () => {
      await ReactTestUtils.act(async () => {
        await editor.update(() => {
          const root = $getRoot();
          const listNode = $createListNode();
          const listItemNode = $createListItemNode();
          const paragraph = $createParagraphNode();
          root.append(listNode);
          listNode.append(listItemNode);
          listItemNode.select();
          listNode.insertAfter(paragraph);
          listItemNode.remove();
          const selection = $getSelection();
          expect(selection.anchor.getNode().__type).toBe('paragraph');
          expect(selection.focus.getNode().__type).toBe('paragraph');
        });
      });
    });
  });

  describe('Selection correctly resolves to a sibling ElementNode that has multiple children with the correct offset when a node is removed', () => {
    test('', async () => {
      await ReactTestUtils.act(async () => {
        await editor.update(() => {
          // Arrange

          // Root
          //  |- Paragraph
          //    |- Link
          //      |- Text
          //      |- LineBreak
          //      |- Text
          //    |- Text
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const link = $createLinkNode();
          const textOne = $createTextNode('Hello');
          const br = $createLineBreakNode();
          const textTwo = $createTextNode('world');
          const textThree = $createTextNode(' ');
          root.append(paragraph);
          link.append(textOne);
          link.append(br);
          link.append(textTwo);
          paragraph.append(link);
          paragraph.append(textThree);
          textThree.select();

          // Act
          textThree.remove();

          // Assert
          const selection = $getSelection();
          const expectedKey = link.getKey();
          const {anchor, focus} = selection;
          expect(anchor.getNode().getKey()).toBe(expectedKey);
          expect(focus.getNode().getKey()).toBe(expectedKey);
          expect(anchor.offset).toBe(3);
          expect(focus.offset).toBe(3);
        });
      });
    });
  });

  test('isBackward', async () => {
    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const paragraphKey = paragraph.getKey();
        const textNode = $createTextNode('foo');
        const textNodeKey = textNode.getKey();
        // Note: line break can't be selected by the DOM
        const linebreak = $createLineBreakNode();
        const selection: Selection = $getSelection();
        const anchor = selection.anchor;
        const focus = selection.focus;

        paragraph.append(textNode, linebreak);

        anchor.set(textNodeKey, 0, 'text');
        focus.set(textNodeKey, 0, 'text');
        expect(selection.isBackward()).toBe(false);

        anchor.set(paragraphKey, 1, 'block');
        focus.set(paragraphKey, 1, 'block');
        expect(selection.isBackward()).toBe(false);

        anchor.set(paragraphKey, 0, 'block');
        focus.set(paragraphKey, 1, 'block');
        expect(selection.isBackward()).toBe(false);

        anchor.set(paragraphKey, 1, 'block');
        focus.set(paragraphKey, 0, 'block');
        expect(selection.isBackward()).toBe(true);
      });
    });
  });

  describe('Decorator text content for selection', () => {
    [
      {
        fn: ({textNode1, anchor, focus}) => {
          anchor.set(textNode1.getKey(), 1, 'text');
          focus.set(textNode1.getKey(), 1, 'text');
          return '';
        },
        name: 'Not included if cursor right before it',
      },
      {
        fn: ({textNode2, anchor, focus}) => {
          anchor.set(textNode2.getKey(), 0, 'text');
          focus.set(textNode2.getKey(), 0, 'text');
          return '';
        },
        name: 'Not included if cursor right after it',
      },
      {
        fn: ({textNode1, textNode2, decorator, anchor, focus}) => {
          anchor.set(textNode1.getKey(), 1, 'text');
          focus.set(textNode2.getKey(), 0, 'text');
          return decorator.getTextContent();
        },
        name: 'Included if decorator is selected within text',
      },
      {
        fn: ({textNode1, textNode2, decorator, anchor, focus}) => {
          anchor.set(textNode1.getKey(), 0, 'text');
          focus.set(textNode2.getKey(), 0, 'text');
          return textNode1.getTextContent() + decorator.getTextContent();
        },
        name: 'Included if decorator is selected with another node before it',
      },
      {
        fn: ({textNode1, textNode2, decorator, anchor, focus}) => {
          anchor.set(textNode1.getKey(), 1, 'text');
          focus.set(textNode2.getKey(), 1, 'text');
          return decorator.getTextContent() + textNode2.getTextContent();
        },
        name: 'Included if decorator is selected with another node after it',
      },
      {
        fn: ({paragraph, textNode1, textNode2, decorator, anchor, focus}) => {
          textNode1.remove();
          textNode2.remove();
          anchor.set(paragraph.getKey(), 0, 'block');
          focus.set(paragraph.getKey(), 1, 'block');
          return decorator.getTextContent();
        },
        name: 'Included if decorator is selected as the only node',
      },
    ]
      .reduce((testSuite, testCase) => {
        const inverse = {
          ...testCase,
          invertSelection: true,
          name: testCase.name + ' (inverse selection)',
        };
        return testSuite.concat(testCase, inverse);
      }, [])
      .forEach(({name, fn, invertSelection}) => {
        it(name, async () => {
          await ReactTestUtils.act(async () => {
            await editor.update(() => {
              const root = $getRoot();
              const paragraph = root.getFirstChild();
              const textNode1 = $createTextNode('1');
              const textNode2 = $createTextNode('2');
              const decorator = $createTestDecoratorNode();
              paragraph.append(textNode1, decorator, textNode2);
              const selection: Selection = $getSelection();
              const expectedTextContent = fn({
                anchor: invertSelection ? selection.focus : selection.anchor,
                decorator,
                focus: invertSelection ? selection.anchor : selection.focus,
                paragraph,
                textNode1,
                textNode2,
              });
              expect(selection.getTextContent()).toBe(expectedTextContent);
            });
          });
        });
      });
  });

  describe('insertParagraph', () => {
    test('three text nodes at offset 0 on third node', async () => {
      const testEditor = createTestEditor();
      const element = document.createElement('div');
      testEditor.setRootElement(element);

      await testEditor.update((state: State) => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello ');
        const text2 = $createTextNode('awesome');
        text2.toggleFormat('bold');
        const text3 = $createTextNode(' world');

        paragraph.append(text, text2, text3);
        root.append(paragraph);

        setAnchorPoint({
          key: text3.getKey(),
          offset: 0,
          type: 'text',
        });
        setFocusPoint({
          key: text3.getKey(),
          offset: 0,
          type: 'text',
        });
        const selection = $getSelection();

        selection.insertParagraph();
      });

      expect(element.innerHTML).toBe(
        '<p dir="ltr"><span data-lexical-text="true">Hello </span><strong data-lexical-text="true">awesome</strong></p><p dir="ltr"><span data-lexical-text="true"> world</span></p>',
      );
    });

    test('four text nodes at offset 0 on third node', async () => {
      const testEditor = createTestEditor();
      const element = document.createElement('div');
      testEditor.setRootElement(element);

      await testEditor.update((state: State) => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello ');
        const text2 = $createTextNode('awesome ');
        text2.toggleFormat('bold');
        const text3 = $createTextNode('beautiful');
        const text4 = $createTextNode(' world');
        text4.toggleFormat('bold');

        paragraph.append(text, text2, text3, text4);
        root.append(paragraph);

        setAnchorPoint({
          key: text3.getKey(),
          offset: 0,
          type: 'text',
        });
        setFocusPoint({
          key: text3.getKey(),
          offset: 0,
          type: 'text',
        });
        const selection = $getSelection();

        selection.insertParagraph();
      });

      expect(element.innerHTML).toBe(
        '<p dir="ltr"><span data-lexical-text="true">Hello </span><strong data-lexical-text="true">awesome </strong></p><p dir="ltr"><span data-lexical-text="true">beautiful</span><strong data-lexical-text="true"> world</strong></p>',
      );
    });

    it('adjust offset for inline elements text formatting', async () => {
      init();
      await editor.update(() => {
        const root = $getRoot();
        const text1 = $createTextNode('--');
        const text2 = $createTextNode('abc');
        const text3 = $createTextNode('--');
        root.append(
          $createParagraphNode().append(
            text1,
            $createLinkNode('https://lexical.dev').append(text2),
            text3,
          ),
        );

        setAnchorPoint({
          key: text1.getKey(),
          offset: 2,
          type: 'text',
        });
        setFocusPoint({
          key: text3.getKey(),
          offset: 0,
          type: 'text',
        });
        const selection = $getSelection();
        selection.formatText('bold');
        expect(text2.hasFormat('bold')).toBe(true);
      });
    });
  });
});
