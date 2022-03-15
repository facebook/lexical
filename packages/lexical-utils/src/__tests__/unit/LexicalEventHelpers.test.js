/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import useLexicalRichText from '@lexical/react/DEPRECATED_useLexicalRichText';
import {
  applySelectionInputs,
  pasteHTML,
  setNativeSelectionWithPaths,
} from '@lexical/selection/src/__tests__/utils';
import {createEditor} from 'lexical';
import ExtendedNodes from 'lexical/ExtendedNodes';
import {LinkNode} from 'lexical/LinkNode';
import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

jest.mock('shared/environment', () => {
  const originalModule = jest.requireActual('shared/environment');

  return {
    ...originalModule,
    IS_FIREFOX: true,
  };
});

describe('LexicalEventHelpers', () => {
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

  function useLexicalEditor(rootElementRef) {
    const editor = React.useMemo(
      () =>
        createEditor({
          nodes: [LinkNode, ...ExtendedNodes],
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
              listitem: 'editor-listitem',
              olDepth: ['editor-list-ol'],
              ulDepth: ['editor-list-ul'],
            },
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
      editor = useLexicalEditor(ref);
      const props = useLexicalRichText(editor);
      return <div ref={ref} contentEditable={true} {...props} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.createRoot(container).render(<TestBase />);
    });
    ref.current.focus();
    await Promise.resolve().then();
    // Focus first element
    setNativeSelectionWithPaths(ref.current, [0, 0], 0, [0, 0], 0);
  }

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  test('Expect initial output to be a block with no text', () => {
    expect(container.innerHTML).toBe(
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph"><br></p></div>',
    );
  });

  describe('onPasteForRichText', () => {
    describe('baseline', () => {
      const suite = [
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><h1 class="editor-heading-h1" dir="ltr"><span data-lexical-text="true">Hello</span></h1></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'><h1>Hello</h1>`)],
          name: 'should produce the correct editor state from a pasted HTML h1 element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><h2 class="editor-heading-h2" dir="ltr"><span data-lexical-text="true">From</span></h2></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'><h2>From</h2>`)],
          name: 'should produce the correct editor state from a pasted HTML h2 element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><h3 class="editor-heading-h3" dir="ltr"><span data-lexical-text="true">The</span></h3></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'><h3>The</h3>`)],
          name: 'should produce the correct editor state from a pasted HTML h3 element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><ul class="editor-list-ul"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">Other side</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">I must have called</span></li></ul></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'><ul><li>Other side</li><li>I must have called</li></ul>`,
            ),
          ],
          name: 'should produce the correct editor state from a pasted HTML ul element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><ol class="editor-list-ol"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">To tell you</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">I’m sorry</span></li></ol></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'><ol><li>To tell you</li><li>I’m sorry</li></ol>`,
            ),
          ],
          name: 'should produce the correct editor state from pasted HTML ol element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">A thousand times</span></p></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'>A thousand times`)],
          name: 'should produce the correct editor state from pasted DOM Text Node',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Bold</strong></p></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'><b>Bold</b>`)],
          name: 'should produce the correct editor state from a pasted HTML b element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><em class="editor-text-italic" data-lexical-text="true">Italic</em></p></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'><i>Italic</i>`)],
          name: 'should produce the correct editor state from a pasted HTML i element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><em class="editor-text-italic" data-lexical-text="true">Italic</em></p></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'><em>Italic</em>`)],
          name: 'should produce the correct editor state from a pasted HTML em element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span class="editor-text-underline" data-lexical-text="true">Underline</span></p></div>',
          inputs: [pasteHTML(`<meta charset='utf-8'><u>Underline</u>`)],
          name: 'should produce the correct editor state from a pasted HTML u element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><h1 class="editor-heading-h1" dir="ltr"><span data-lexical-text="true">Lyrics to Hello by Adele</span></h1><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">A thousand times</span></p></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'><h1>Lyrics to Hello by Adele</h1>A thousand times`,
            ),
          ],
          name: 'should produce the correct editor state from pasted heading node followed by a DOM Text Node',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph"><a href="https://facebook.com/" dir="ltr"><span data-lexical-text="true">Facebook</span></a></p></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'><a href="https://facebook.com">Facebook</a>`,
            ),
          ],
          name: 'should produce the correct editor state from a pasted HTML anchor element',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><span data-lexical-text="true">Facebook!</span></a></p></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'>Welcome to<a href="https://facebook.com">Facebook!</a>`,
            ),
          ],
          name: 'should produce the correct editor state from a pasted combination of an HTML text node followed by an anchor node',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><span data-lexical-text="true">Facebook!</span></a><span data-lexical-text="true">We hope you like it here.</span></p></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'>Welcome to<a href="https://facebook.com">Facebook!</a>We hope you like it here.`,
            ),
          ],
          name: 'should produce the correct editor state from a pasted combination of HTML anchor elements and text nodes',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><ul class="editor-list-ul"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">from the other</span></li><li value="3" class="editor-listitem" dir="ltr"><span data-lexical-text="true">side</span></li></ul></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'><doesnotexist><ul><li>Hello</li><li>from the other</li><li>side</li></ul></doesnotexist>`,
            ),
          ],
          name: 'should ignore DOM node types that do not have transformers, but still process their children.',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><ul class="editor-list-ul"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">from the other</span></li><li value="3" class="editor-listitem" dir="ltr"><span data-lexical-text="true">side</span></li></ul></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'><doesnotexist><doesnotexist><ul><li>Hello</li><li>from the other</li><li>side</li></ul></doesnotexist></doesnotexist>`,
            ),
          ],
          name: 'should ignore multiple levels of DOM node types that do not have transformers, but still process their children.',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Facebook!</strong></a><span data-lexical-text="true">We hope you like it here.</span></p></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'>Welcome to<b><a href="https://facebook.com">Facebook!</a></b>We hope you like it here.`,
            ),
          ],
          name: 'should preserve formatting from HTML tags on deeply nested text nodes.',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Facebook!</strong></a><strong class="editor-text-bold" data-lexical-text="true">We hope you like it here.</strong></p></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'>Welcome to<b><a href="https://facebook.com">Facebook!</a>We hope you like it here.</b>`,
            ),
          ],
          name: 'should preserve formatting from HTML tags on deeply nested and top level text nodes.',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><strong class="editor-text-bold editor-text-italic" data-lexical-text="true">Facebook!</strong></a><strong class="editor-text-bold editor-text-italic" data-lexical-text="true">We hope you like it here.</strong></p></div>',
          inputs: [
            pasteHTML(
              `<meta charset='utf-8'>Welcome to<b><i><a href="https://facebook.com">Facebook!</a>We hope you like it here.</i></b>`,
            ),
          ],
          name: 'should preserve multiple types of formatting on deeply nested text nodes and top level text nodes',
        },
      ];
      suite.forEach((testUnit, i) => {
        const name = testUnit.name || 'Test case';
        test(name + ` (#${i + 1})`, async () => {
          await applySelectionInputs(testUnit.inputs, update, editor);
          // Validate HTML matches
          expect(container.innerHTML).toBe(testUnit.expectedHTML);
        });
      });
    });
    describe('Google Docs', () => {
      const suite = [
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Get schwifty!</span></p></div>',
          inputs: [
            pasteHTML(
              `<b style="font-weight:normal;" id="docs-internal-guid-2c706577-7fff-f54a-fe65-12f480020fac"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Get schwifty!</span></b>`,
            ),
          ],
          name: 'should produce the correct editor state from Normal text',
        },
        {
          expectedHTML:
            '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; overflow-wrap: break-word;" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Get schwifty!</strong></p></div>',
          inputs: [
            pasteHTML(
              `<b style="font-weight:normal;" id="docs-internal-guid-9db03964-7fff-c26c-8b1e-9484fb3b54a4"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Get schwifty!</span></b>`,
            ),
          ],
          name: 'should produce the correct editor state from bold text',
        },
      ];
      suite.forEach((testUnit, i) => {
        const name = testUnit.name || 'Test case';
        test(name + ` (#${i + 1})`, async () => {
          await applySelectionInputs(testUnit.inputs, update, editor);
          // Validate HTML matches
          expect(container.innerHTML).toBe(testUnit.expectedHTML);
        });
      });
    });
  });
});
