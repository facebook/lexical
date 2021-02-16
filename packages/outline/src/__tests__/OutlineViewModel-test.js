let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;
let ParagraphNodeModule;

describe('OutlineViewModel tests', () => {
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

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

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

  test('read()', async () => {
    await update((view) => {
      const paragraph = ParagraphNodeModule.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });

    let root = null;
    let paragraph = null;
    let text = null;

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
      __flags: 0,
      __key: '_1',
      __parent: 'root',
      __type: 'paragraph',
    });
    expect(text).toEqual({
      __text: '',
      __flags: 0,
      __key: '_2',
      __parent: '_1',
      __type: 'text',
      __url: null,
    });
  });

  test('stringify()', async () => {
    await update((view) => {
      const paragraph = ParagraphNodeModule.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
    const string = editor.getViewModel().stringify();

    expect(string).toEqual(
      '{"_nodeMap":{"root":{"__type":"root","__flags":0,"__key":"root","__parent":null,"__children":["_4"]},"_4"' +
        ':{"__type":"paragraph","__flags":0,"__key":"_4","__parent":"root","__children":["_5"]},"_5":{"__type":"text",' +
        '"__flags":0,"__key":"_5","__parent":"_4","__text":"","__url":null}},"_selection":null}',
    );
  });
});
