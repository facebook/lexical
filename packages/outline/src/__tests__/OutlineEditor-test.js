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

  let editor = null;

  function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = Outline.useOutlineEditor(ref);
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });
  }

  test('draft + read works', () => {
    // Draft some content to the editor
    const viewModel = editor.draft((view) => {
      const paragraph = Outline.createParagraph();
      const text = Outline.createText();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
    // Update editor view
    editor.update(viewModel, true);

    let root = null;
    let paragraph = null;
    let text = null;

    // Read editor model
    editor.read((view) => {
      root = view.getRoot();
      paragraph = root.getFirstChild();
      text = paragraph.getFirstChild();
    });

    expect(root).toEqual({
      _children: ['0'],
      _flags: 0,
      _key: 'root',
      _parent: null,
      _type: 'root',
    });
    expect(paragraph).toEqual({
      _children: ['1'],
      _flags: 4,
      _key: '0',
      _parent: 'root',
      _type: 'paragraph',
    });
    expect(text).toEqual({
      _text: '',
      _flags: 4,
      _key: '1',
      _parent: '0',
      _type: 'text',
    });
  });
});
