let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;
let ParagraphNodeModule;

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
    ParagraphNodeModule = require('outline-extensions/ParagraphNode');

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

  test('parseViewModel()', () => {
    editor.update(
      (view) => {
        const paragraph = ParagraphNodeModule.createParagraphNode();
        const text = Outline.createTextNode();
        paragraph.append(text);
        view.getRoot().append(paragraph);
      },
      undefined,
      true,
    );

    editor.addNodeType('paragraph', ParagraphNodeModule.ParagraphNode);
    const stringifiedViewModel = editor.getViewModel().stringify();
    const viewModel = editor.parseViewModel(stringifiedViewModel);

    let root = null;
    let paragraph = null;
    let text = null;

    viewModel.read((view) => {
      root = view.getRoot();
      paragraph = root.getFirstChild();
      text = paragraph.getFirstChild();
    });

    expect(root).toEqual({
      __children: ['_3'],
      __flags: 0,
      __key: 'root',
      __parent: null,
      __type: 'root',
    });
    expect(paragraph).toEqual({
      __children: ['_4'],
      __flags: 0,
      __key: '_3',
      __parent: 'root',
      __type: 'paragraph',
    });
    expect(text).toEqual({
      __text: '',
      __flags: 0,
      __key: '_4',
      __parent: '_3',
      __type: 'text',
      __url: null,
    });
  });

  describe('setPlaceholder', () => {
    it('Placeholder shows when there is no content', () => {
      editor.setPlaceholder('Placeholder text');

      editor.update(
        (view) => {
          const paragraph = ParagraphNodeModule.createParagraphNode();
          const text = Outline.createTextNode();
          paragraph.append(text);
          view.getRoot().append(paragraph);
        },
        undefined,
        true,
      );

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div>' +
          'Placeholder text</div><p><span data-text="true"><br></span></p></div>',
      );
    });

    it('Placeholder does not should when there is content', () => {
      editor.setPlaceholder('Placeholder text');

      editor.update(
        (view) => {
          const paragraph = ParagraphNodeModule.createParagraphNode();
          const text = Outline.createTextNode('Some text');
          paragraph.append(text);
          view.getRoot().append(paragraph);
        },
        undefined,
        true,
      );

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div style="display: none;">' +
          'Placeholder text</div><p dir="ltr"><span data-text="true">Some text</span></p></div>',
      );
    });

    it('Placeholder does not should when there are two paragraphs', () => {
      editor.setPlaceholder('Placeholder text');

      editor.update(
        (view) => {
          const paragraph = ParagraphNodeModule.createParagraphNode();
          const text = Outline.createTextNode();
          paragraph.append(text);
          const paragraph2 = ParagraphNodeModule.createParagraphNode();
          const text2 = Outline.createTextNode();
          paragraph2.append(text2);
          view.getRoot().append(paragraph);
          view.getRoot().append(paragraph2);
        },
        undefined,
        true,
      );

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div style="display: none;">' +
          'Placeholder text</div><p><span data-text="true"><br></span></p><p>' +
          '<span data-text="true"><br></span></p></div>',
      );
    });
  });
});
