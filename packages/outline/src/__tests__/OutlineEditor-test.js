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
      const paragraph = Outline.createParagraph();
      const text = Outline.createText();
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
      _children: ['_1'],
      _flags: 0,
      _key: 'root',
      _parent: null,
      _type: 'root',
    });
    expect(paragraph).toEqual({
      _children: ['_2'],
      _flags: 4,
      _key: '_1',
      _parent: 'root',
      _type: 'paragraph',
    });
    expect(text).toEqual({
      _text: '',
      _flags: 4,
      _key: '_2',
      _parent: '_1',
      _type: 'text',
      _url: null,
    });
  });
});
