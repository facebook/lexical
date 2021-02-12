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

describe('OutlineNode tests', () => {
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

  function update(callback) {
    editor.update(callback, undefined, true);
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

    // Insert initial block
    update((view) => {
      const paragraph = ParagraphNode.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
  }

  test('replaceNode()', () => {
    update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('Replaced node!');
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true">Replaced node!</span></p></div>',
    );
  });

  test('replaceNode() (immutable)', () => {
    update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('Replaced node!');
      newTextNode.makeImmutable();
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">Replaced node!</span><span data-text="true"></span></p></div>',
    );
  });

  test('replaceNode() (segmented)', () => {
    update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('Replaced node!');
      newTextNode.makeSegmented();
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">Replaced node!</span><span data-text="true"></span></p></div>',
    );
  });

  test('removeNode()', () => {
    update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      oldTextNode.remove();
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p></p></div>',
    );
  });

  test('append()', () => {
    update((view) => {
      const paragraph = view.getRoot().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span></p></div>',
    );
  });

  test('append() (immutable)', () => {
    update((view) => {
      const paragraph = view.getRoot().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeImmutable();
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span><span data-text="true"></span></p></div>',
    );
  });

  test('append() (segmented)', () => {
    update((view) => {
      const paragraph = view.getRoot().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeSegmented();
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span><span data-text="true"></span></p></div>',
    );
  });

  test('insertAfter()', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span></p></div>',
    );
  });

  test('insertAfter() (immutable)', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeImmutable();
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span><span data-text="true"></span></p></div>',
    );
  });

  test('insertAfter() (segmented)', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeSegmented();
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span><span data-text="true"></span></p></div>',
    );
  });

  test('insertBefore()', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true">New node!</span>' +
        '<span data-text="true"></span></p></div>',
    );
  });

  test('insertBefore() (immutable)', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeImmutable();
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span>' +
        '<span data-text="true"></span></p></div>',
    );
  });

  test('insertBefore() (segmented)', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeSegmented();
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-text="true"></span>' +
        '<span data-text="true">New node!</span>' +
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

  test('getCommonAncestor()', () => {
    update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const textNode2 = Outline.createTextNode('New node!');
      textNode.insertAfter(textNode2);
      // Our common ancestor here isn't the paragraph node, it's a writable clone.
      // Let's commit this update and test getCommonAncestor on a fresh view.
      const secondParagraph = ParagraphNode.createParagraphNode();
      const textNode3 = Outline.createTextNode('Another node!');
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
