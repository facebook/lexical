let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;

describe('OutlineEditor tests', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOM = require('react-dom');
    ReactTestUtils = require('react-dom/test-utils');
    Outline = require('outline');

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
      const paragraph = Outline.createParagraphNode();
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
      children: ['_1'],
      flags: 0,
      key: 'root',
      parent: null,
      type: 'root',
    });
    expect(paragraph).toEqual({
      children: ['_2'],
      flags: 4,
      key: '_1',
      parent: 'root',
      type: 'paragraph',
    });
    expect(text).toEqual({
      text: '',
      flags: 4,
      key: '_2',
      parent: '_1',
      type: 'text',
      url: null,
    });
  });
});
