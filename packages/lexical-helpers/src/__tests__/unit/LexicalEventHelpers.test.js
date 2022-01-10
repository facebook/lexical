import {createEditor} from 'lexical';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import useLexicalRichText from '@lexical/react/useLexicalRichText';
import {$createTextNode} from 'lexical';
import {LinkNode} from 'lexical/LinkNode';

jest.mock('shared/environment', () => {
  const originalModule = jest.requireActual('shared/environment');

  return {
    ...originalModule,
    IS_FIREFOX: true,
  };
});

import {
  setNativeSelectionWithPaths,
  pasteHTML,
  applySelectionInputs,
} from '../utils';

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
              ol1: 'editor-list-ol',
              ul1: 'editor-list-ul',
              listitem: 'editor-listitem',
            },
            image: 'editor-image',
            text: {
              bold: 'editor-text-bold',
              link: 'editor-text-link',
              italic: 'editor-text-italic',
              hashtag: 'editor-text-hashtag',
              underline: 'editor-text-underline',
              strikethrough: 'editor-text-strikethrough',
              underlineStrikethrough: 'editor-text-underlineStrikethrough',
              code: 'editor-text-code',
            },
            code: 'editor-code',
          },
          htmlTransforms: {
            testhtmltagname: () => ({node: $createTextNode('Hello world!')}),
          },
        }),
      [],
    );

    React.useEffect(() => {
      const rootElement = rootElementRef.current;

      editor.addListener('error', (error) => {
        throw error;
      });

      editor.setRootElement(rootElement);
      const unregisterNodes = editor.registerNodes([LinkNode]);

      return () => {
        unregisterNodes();
      };
    }, [rootElementRef, editor]);

    return editor;
  }

  let editor = null;

  async function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useLexicalEditor(ref);
      const props = useLexicalRichText(editor, false);
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
      '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph"><br></p></div>',
    );
  });

  describe('onPasteForRichText', () => {
    const suite = [
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML h1 element',
        inputs: [pasteHTML(`<meta charset='utf-8'><h1>Hello</h1>`)],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><h1 class="editor-heading-h1" dir="ltr"><span data-lexical-text="true">Hello</span></h1></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML h2 element',
        inputs: [pasteHTML(`<meta charset='utf-8'><h2>From</h2>`)],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><h2 class="editor-heading-h2" dir="ltr"><span data-lexical-text="true">From</span></h2></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML h3 element',
        inputs: [pasteHTML(`<meta charset='utf-8'><h3>The</h3>`)],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><h3 class="editor-heading-h3" dir="ltr"><span data-lexical-text="true">The</span></h3></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML ul element',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><ul><li>Other side</li><li>I must have called</li></ul>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><ul class="editor-list-ul"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">Other side</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">I must have called</span></li></ul></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from pasted HTML ol element',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><ol><li>To tell you</li><li>I’m sorry</li></ol>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><ol class="editor-list-ol"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">To tell you</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">I’m sorry</span></li></ol></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from pasted DOM Text Node',
        inputs: [pasteHTML(`<meta charset='utf-8'>A thousand times`)],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">A thousand times</span></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML b element',
        inputs: [pasteHTML(`<meta charset='utf-8'><b>Bold</b>`)],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Bold</strong></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML i element',
        inputs: [pasteHTML(`<meta charset='utf-8'><i>Italic</i>`)],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><em class="editor-text-italic" data-lexical-text="true">Italic</em></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML u element',
        inputs: [pasteHTML(`<meta charset='utf-8'><u>Underline</u>`)],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span class="editor-text-underline" data-lexical-text="true">Underline</span></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from pasted heading node followed by a DOM Text Node',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><h1>Lyrics to Hello by Adele</h1>A thousand times`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><h1 class="editor-heading-h1" dir="ltr"><span data-lexical-text="true">Lyrics to Hello by Adele</span></h1><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">A thousand times</span></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML anchor element',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><a href="https://facebook.com">Facebook</a>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph"><a href="https://facebook.com/" dir="ltr"><span data-lexical-text="true">Facebook</span></a></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted combination of an HTML text node followed by an anchor node',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'>Welcome to<a href="https://facebook.com">Facebook!</a>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><span data-lexical-text="true">Facebook!</span></a></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted combination of HTML anchor elements and text nodes',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'>Welcome to<a href="https://facebook.com">Facebook!</a>We hope you like it here.`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><span data-lexical-text="true">Facebook!</span></a><span data-lexical-text="true">We hope you like it here.</span></p></div>',
      },
      {
        name: 'onPasteForRichText should ignore DOM node types that do not have transformers, but still process their children.',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><doesnotexist><ul><li>Hello</li><li>from the other</li><li>side</li></ul></doesnotexist>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><ul class="editor-list-ul"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">from the other</span></li><li value="3" class="editor-listitem" dir="ltr"><span data-lexical-text="true">side</span></li></ul></div>',
      },
      {
        name: 'onPasteForRichText should ignore multiple levels of DOM node types that do not have transformers, but still process their children.',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><doesnotexist><doesnotexist><ul><li>Hello</li><li>from the other</li><li>side</li></ul></doesnotexist></doesnotexist>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><ul class="editor-list-ul"><li value="1" class="editor-listitem" dir="ltr"><span data-lexical-text="true">Hello</span></li><li value="2" class="editor-listitem" dir="ltr"><span data-lexical-text="true">from the other</span></li><li value="3" class="editor-listitem" dir="ltr"><span data-lexical-text="true">side</span></li></ul></div>',
      },
      {
        name: 'onPasteForRichText should respect htmlTransforms passed in via the editor config.',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><testhtmltagname>World, hello!</testhtmltagname>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Hello world!</span></p></div>',
      },
      {
        name: 'onPasteForRichText should preserve formatting from HTML tags on deeply nested text nodes.',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'>Welcome to<b><a href="https://facebook.com">Facebook!</a></b>We hope you like it here.`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Facebook!</strong></a><span data-lexical-text="true">We hope you like it here.</span></p></div>',
      },
      {
        name: 'onPasteForRichText should preserve formatting from HTML tags on deeply nested and top level text nodes.',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'>Welcome to<b><a href="https://facebook.com">Facebook!</a>We hope you like it here.</b>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Facebook!</strong></a><strong class="editor-text-bold" data-lexical-text="true">We hope you like it here.</strong></p></div>',
      },
      {
        name: 'onPasteForRichText should preserve multiple types of formatting on deeply nested text nodes and top level text nodes',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'>Welcome to<b><i><a href="https://facebook.com">Facebook!</a>We hope you like it here.</i></b>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-lexical-editor="true"><p class="editor-paragraph" dir="ltr"><span data-lexical-text="true">Welcome to</span><a href="https://facebook.com/" dir="ltr"><strong class="editor-text-bold editor-text-italic" data-lexical-text="true">Facebook!</strong></a><strong class="editor-text-bold editor-text-italic" data-lexical-text="true">We hope you like it here.</strong></p></div>',
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
