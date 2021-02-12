let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;
let ParagraphNode;

function sanitizeHTML(html) {
  // Remove the special space characters
  return html.replace(/\uFEFF/g, '');
}

describe('OutlineEditor tests', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOM = require('react-dom');
    ReactTestUtils = require('react-dom/test-utils');
    Outline = require('outline');
    ParagraphNode = require('outline-extensions/ParagraphNode');

    container = document.createElement('div');
    document.body.appendChild(container);
    init();
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  function useOutlineEditor(editorElementRef) {
    const editor = React.useMemo(() => Outline.createEditor(), []);

    React.useEffect(() => {
      const editorElement = editorElementRef.current;

      editor.setEditorElement(editorElement);
    }, [editorElementRef, editor]);

    return editor;
  }

  let editor = null;

  function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });
  }

  describe('Placeholder', () => {
    it('Placeholder shows when there is no content', () => {
      editor.setPlaceholder('Placeholder text');

      editor.update((view) => {
        const paragraph = ParagraphNode.createParagraphNode();
        const text = Outline.createTextNode();
        paragraph.append(text);
        view.getRoot().append(paragraph);
      }, undefined, true);

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div>' +
          'Placeholder text</div><p><span data-text="true"><br></span></p></div>',
      );
    });

    it('Placeholder does not should when there is content', () => {
      editor.setPlaceholder('Placeholder text');

      editor.update((view) => {
        const paragraph = ParagraphNode.createParagraphNode();
        const text = Outline.createTextNode('Some text');
        paragraph.append(text);
        view.getRoot().append(paragraph);
      }, undefined, true);

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div style="display: none;">' +
          'Placeholder text</div><p dir="ltr"><span data-text="true">Some text</span></p></div>',
      );
    });

    it('Placeholder does not should when there are two paragraphs', () => {
      editor.setPlaceholder('Placeholder text');

      editor.update((view) => {
        const paragraph = ParagraphNode.createParagraphNode();
        const text = Outline.createTextNode();
        paragraph.append(text);
        const paragraph2 = ParagraphNode.createParagraphNode();
        const text2 = Outline.createTextNode();
        paragraph2.append(text2);
        view.getRoot().append(paragraph);
        view.getRoot().append(paragraph2);
      }, undefined, true);

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div style="display: none;">' +
          'Placeholder text</div><p><span data-text="true"><br></span></p><p>' +
          '<span data-text="true"><br></span></p></div>',
      );
    });
  });
});
