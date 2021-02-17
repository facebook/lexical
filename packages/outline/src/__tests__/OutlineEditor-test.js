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
    jest.isolateModules(() => {
      ParagraphNodeModule = require('outline-extensions/ParagraphNode');
      Outline = require('outline');
    });

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

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  describe('parseViewModel()', () => {
    let originalText;
    let parsedParagraph;
    let parsedRoot;
    let parsedSelection;
    let parsedText;

    beforeEach(async () => {
      await update((view) => {
        const paragraph = ParagraphNodeModule.createParagraphNode();
        originalText = Outline.createTextNode('Hello world');
        originalText.select(6, 11);
        paragraph.append(originalText);
        view.getRoot().append(paragraph);
      });
      editor.addNodeType('paragraph', ParagraphNodeModule.ParagraphNode);
      const stringifiedViewModel = editor.getViewModel().stringify();
      const viewModel = editor.parseViewModel(stringifiedViewModel);
      viewModel.read((view) => {
        parsedRoot = view.getRoot();
        parsedParagraph = parsedRoot.getFirstChild();
        parsedText = parsedParagraph.getFirstChild();
        parsedSelection = view.getSelection();
      });
    });

    it('Parses the nodes of a stringified view model', async () => {
      expect(parsedRoot).toEqual({
        __children: ['_3'],
        __flags: 0,
        __key: 'root',
        __parent: null,
        __type: 'root',
      });
      expect(parsedParagraph).toEqual({
        __children: ['_4'],
        __flags: 0,
        __key: '_3',
        __parent: 'root',
        __type: 'paragraph',
      });
      expect(parsedText).toEqual({
        __text: 'Hello world',
        __flags: 0,
        __key: '_4',
        __parent: '_3',
        __type: 'text',
        __url: null,
      });
    });

    it('Parses the selection offsets of a stringified view model', async () => {
      expect(parsedSelection.anchorOffset).toEqual(6);
      expect(parsedSelection.focusOffset).toEqual(11);
    });

    it('Remaps the selection keys of a stringified view model', async () => {
      expect(parsedSelection.anchorKey).not.toEqual(originalText.__key);
      expect(parsedSelection.focusKey).not.toEqual(originalText.__key);
      expect(parsedSelection.anchorKey).toEqual(parsedText.__key);
      expect(parsedSelection.focusKey).toEqual(parsedText.__key);
    });
  });

  describe('setPlaceholder', () => {
    it('Placeholder shows when there is no content', async () => {
      editor.setPlaceholder('Placeholder text');

      await update((view) => {
        const paragraph = ParagraphNodeModule.createParagraphNode();
        const text = Outline.createTextNode();
        paragraph.append(text);
        view.getRoot().append(paragraph);
      });

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><div>' +
          'Placeholder text</div><p><span><br></span></p></div>',
      );
    });

    it('Placeholder does not should when there is content', async () => {
      editor.setPlaceholder('Placeholder text');

      await update((view) => {
        const paragraph = ParagraphNodeModule.createParagraphNode();
        const text = Outline.createTextNode('Some text');
        paragraph.append(text);
        view.getRoot().append(paragraph);
      });

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span>Some text</span></p></div>',
      );
    });

    it('Placeholder does not should when there are two paragraphs', async () => {
      editor.setPlaceholder('Placeholder text');

      await update((view) => {
        const paragraph = ParagraphNodeModule.createParagraphNode();
        const text = Outline.createTextNode();
        paragraph.append(text);
        const paragraph2 = ParagraphNodeModule.createParagraphNode();
        const text2 = Outline.createTextNode();
        paragraph2.append(text2);
        view.getRoot().append(paragraph);
        view.getRoot().append(paragraph2);
      });

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span><br></span></p><p>' +
          '<span><br></span></p></div>',
      );
    });
  });
});
