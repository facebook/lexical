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

  test('update + read works', () => {
    // Update editor view
    editor.update((view) => {
      const paragraph = ParagraphNode.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    }, true);

    let root = null;
    let paragraph = null;
    let text = null;

    // Read editor model
    editor.getViewModel().read((view) => {
      root = view.getRoot();
      paragraph = root.getFirstChild();
      text = paragraph.getFirstChild();
    });

    expect(root).toEqual({
      __children: ['_1'],
      __flags: 0,
      __key: 'root',
      __parent: null,
      __type: 'root',
    });
    expect(paragraph).toEqual({
      __children: ['_2'],
      __flags: 4,
      __key: '_1',
      __parent: 'root',
      __type: 'paragraph',
    });
    expect(text).toEqual({
      __text: '',
      __flags: 4,
      __key: '_2',
      __parent: '_1',
      __type: 'text',
      __url: null,
    });
  });

  describe('Placeholder', () => {
    it('Placeholder shows when there is no content', () => {
      editor.setPlaceholder('Placeholder text');

      editor.update((view) => {
        const paragraph = ParagraphNode.createParagraphNode();
        const text = Outline.createTextNode();
        paragraph.append(text);
        view.getRoot().append(paragraph);
      }, true);

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div class="placeholder" style="display: block;">' +
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
      }, true);

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div class="placeholder" style="display: none;">' +
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
      }, true);

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div class="placeholder" style="display: none;">' +
          'Placeholder text</div><p><span data-text="true"><br></span></p><p>' +
          '<span data-text="true"><br></span></p></div>',
      );
    });
  });
});
