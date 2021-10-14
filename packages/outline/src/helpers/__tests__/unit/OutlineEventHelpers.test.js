import {createEditor} from 'outline';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import useOutlineRichText from 'outline-react/useOutlineRichText';

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

describe('OutlineEventHelpers', () => {
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

      editor.addListener('error', (error) => {
        throw error;
      });

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
    setNativeSelectionWithPaths(ref.current, [0, 0], 0, [0, 0], 0);
  }

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  test('Expect initial output to be a block with no text', () => {
    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><br></p></div>',
    );
  });

  describe('onPasteForRichText', () => {
    const suite = [
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML h1 element',
        inputs: [pasteHTML(`<meta charset='utf-8'><h1>Hello</h1>`)],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><h1 class="editor-heading-h1"><span data-outline-text="true">Hello</span></h1></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML h2 element',
        inputs: [pasteHTML(`<meta charset='utf-8'><h2>From</h2>`)],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><h2 class="editor-heading-h2"><span data-outline-text="true">From</span></h2></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML h3 element',
        inputs: [pasteHTML(`<meta charset='utf-8'><h3>The</h3>`)],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><h3 class="editor-heading-h3"><span data-outline-text="true">The</span></h3></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML ul element',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><ul><li>Other side</li><li>I must have called</li></ul>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><ul class="editor-list-ul"><li class="editor-listitem"><span data-outline-text="true">Other side</span></li><li class="editor-listitem"><span data-outline-text="true">I must have called</span></li></ul></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from pasted HTML ol element',
        inputs: [
          pasteHTML(
            `<meta charset='utf-8'><ol><li>To tell you</li><li>I’m sorry</li></ol>`,
          ),
        ],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><ol class="editor-list-ol"><li class="editor-listitem"><span data-outline-text="true">To tell you</span></li><li class="editor-listitem"><span data-outline-text="true">I’m sorry</span></li></ol></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from pasted DOM Text Node',
        inputs: [pasteHTML(`<meta charset='utf-8'>A thousand times`)],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span data-outline-text="true">A thousand times</span></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML b element',
        inputs: [pasteHTML(`<meta charset='utf-8'><b>Bold</b>`)],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><strong class="editor-text-bold" data-outline-text="true">Bold</strong></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML i element',
        inputs: [pasteHTML(`<meta charset='utf-8'><i>Italic</i>`)],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><em class="editor-text-italic" data-outline-text="true">Italic</em></p></div>',
      },
      {
        name: 'onPasteForRichText should produce the correct editor state from a pasted HTML u element',
        inputs: [pasteHTML(`<meta charset='utf-8'><u>Underline</u>`)],
        expectedHTML:
          '<div contenteditable="true" data-outline-editor="true"><p class="editor-paragraph"><span class="editor-text-underline" data-outline-text="true">Underline</span></p></div>',
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
