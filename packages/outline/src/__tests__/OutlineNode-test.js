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

    // Insert initial branch
    update((view) => {
      const paragraph = Outline.createParagraph();
      const text = Outline.createText();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
  }

  test('replaceNode', () => {
    update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createText('Replaced node!');
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p dir="ltr"><span data-text="true">Replaced node!</span></p></div>',
    );
  });

  test('removeNode', () => {
    update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      oldTextNode.remove();
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p></p></div>',
    );
  });

  test('append', () => {
    update((view) => {
      const paragraph = view.getRoot().getFirstChild();
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
      const textNode = view.getRoot().getFirstChild().getFirstChild();
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
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createText('New node!');
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true"><p dir="ltr"><span data-text="true">New node!</span>' +
        '<span data-text="true"></span></p></div>',
    );
  });

  test('isParentOf', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      expect(view.getRoot().isParentOf(textNode));
      expect(view.getRoot().getFirstChild().isParentOf(textNode));
    });
  });

  test('getCommonAncestor', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const textNode2 = Outline.createText('New node!');
      textNode.insertAfter(textNode2);
      // Our common ancestor here isn't the paragraph node, it's a writable clone.
      // Let's commit this update and test getCommonAncestor on a fresh view.
      const secondParagraph = Outline.createParagraph();
      const textNode3 = Outline.createText('Another node!');
      secondParagraph.append(textNode3);
      view.getRoot().getFirstChild().insertAfter(secondParagraph);
      // Structure is now:
      // root - p - ''
      //  |     ' - 'New node!'
      //  ' --- p - 'Another node!'
    });

    update((view) => {
      const root = view.getRoot();
      const paragraphNode = root.getFirstChild();
      const textNode = paragraphNode.getFirstChild();
      const textNode2 = paragraphNode.getLastChild();
      const secondParagraph = root.getLastChild();
      const textNode3 = secondParagraph.getFirstChild();

      expect(textNode.getTextContent()).toBe('');
      expect(textNode2.getTextContent()).toBe('New node!');
      expect(textNode3.getTextContent()).toBe('Another node!');

      expect(textNode.getCommonAncestor(textNode2)).toBe(paragraphNode);
      expect(secondParagraph.getCommonAncestor(paragraphNode)).toBe(root);
      expect(textNode.getCommonAncestor(secondParagraph)).toBe(root);
      expect(textNode3.getCommonAncestor(textNode2)).toBe(root);

      expect(textNode3.getCommonAncestor(secondParagraph)).toBe(root);
      expect(secondParagraph.getCommonAncestor(root)).toBe(null);
      expect(textNode.getCommonAncestor(root)).toBe(null);
    });
  });
});
