let container = null;
let React;
let ReactDOM;
let ReactTestUtils;
let Outline;

function sanitizeHTML(html) {
  // Remove the special space characters
  return html.replace(/\uFEFF/g, '');
}

describe('OutlineSelection tests', () => {
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

  function update(callback) {
    const viewModel = editor.createViewModel(callback);
    editor.update(viewModel, true);
  }

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

    // Insert initial block
    update((view) => {
      const paragraph = Outline.createParagraph();
      const text = Outline.createText();
      paragraph.append(text);
      view.getBody().append(paragraph);
    });
  }

  test('replaceNode', () => {
    update((view) => {
      const oldTextNode = view.getBody().getFirstChild().getFirstChild();
      const newTextNode = Outline.createText('Replaced node!');
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p dir="ltr"><span data-text="true">Replaced node!</span></p></div>',
    );
  });

  test('removeNode', () => {
    update((view) => {
      const oldTextNode = view.getBody().getFirstChild().getFirstChild();
      oldTextNode.remove();
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p></p></div>',
    );
  });

  test('append', () => {
    update((view) => {
      const paragraph = view.getBody().getFirstChild();
      const newTextNode = Outline.createText('New node!');
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span></p></div>',
    );
  });

  test('insertAfter', () => {
    update((view) => {
      const textNode = view.getBody().getFirstChild().getFirstChild();
      const newTextNode = Outline.createText('New node!');
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span></p></div>',
    );
  });

  test('insertBefore', () => {
    update((view) => {
      const textNode = view.getBody().getFirstChild().getFirstChild();
      const newTextNode = Outline.createText('New node!');
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p dir="ltr"><span data-text="true">New node!</span>' +
        '<span data-text="true"></span></p></div>',
    );
  });
});
