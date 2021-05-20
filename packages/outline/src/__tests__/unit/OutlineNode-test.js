/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import Outline from 'outline';
import ParagraphNodeModule from 'outline-extensions/ParagraphNode';

function sanitizeHTML(html) {
  // Remove the special space characters
  return html.replace(/\uFEFF/g, '');
}

describe('OutlineNode tests', () => {
  let container = null;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    await init();
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

  async function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      editor.addErrorListener((error) => {
        throw error;
      });
      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase />, container);
    });

    // Insert initial block
    await update((view) => {
      const paragraph = ParagraphNodeModule.createParagraphNode();
      const text = Outline.createTextNode();
      paragraph.append(text);
      view.getRoot().append(paragraph);
    });
  }

  test('replaceNode()', async () => {
    await update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('Replaced node!');
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span>Replaced node!</span></p></div>',
    );
  });

  test('replaceNode() (immutable)', async () => {
    await update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('Replaced node!');
      newTextNode.makeImmutable();
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>Replaced node!</span><span></span></p></div>',
    );
  });

  test('replaceNode() (segmented)', async () => {
    await update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('Replaced node!');
      newTextNode.makeSegmented();
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>Replaced node!</span><span></span></p></div>',
    );
  });

  test('replaceNode() (inert)', async () => {
    await update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('Replaced node!');
      newTextNode.makeInert();
      oldTextNode.replace(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span style="pointer-events: none; user-select: none;">Replaced node!</span><span></span></p></div>',
    );
  });

  test('removeNode()', async () => {
    await update((view) => {
      const oldTextNode = view.getRoot().getFirstChild().getFirstChild();
      oldTextNode.remove();
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p></p></div>',
    );
  });

  test('append()', async () => {
    await update((view) => {
      const paragraph = view.getRoot().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span></p></div>',
    );
  });

  test('append() (immutable)', async () => {
    await update((view) => {
      const paragraph = view.getRoot().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeImmutable();
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span><span></span></p></div>',
    );
  });

  test('append() (segmented)', async () => {
    await update((view) => {
      const paragraph = view.getRoot().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeSegmented();
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span><span></span></p></div>',
    );
  });

  test('append() (inert)', async () => {
    await update((view) => {
      const paragraph = view.getRoot().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeInert();
      paragraph.append(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span style="pointer-events: none; user-select: none;">New node!</span><span></span></p></div>',
    );
  });

  test('insertAfter()', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span></p></div>',
    );
  });

  test('insertAfter() (immutable)', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeImmutable();
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span><span></span></p></div>',
    );
  });

  test('insertAfter() (segmented)', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeSegmented();
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span><span></span></p></div>',
    );
  });

  test('insertAfter() (inert)', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeInert();
      textNode.insertAfter(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span style="pointer-events: none; user-select: none;">New node!</span><span></span></p></div>',
    );
  });

  test('insertBefore()', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span>New node!</span>' +
        '<span></span></p></div>',
    );
  });

  test('insertBefore() (immutable)', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeImmutable();
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span>' +
        '<span></span></p></div>',
    );
  });

  test('insertBefore() (segmented)', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeSegmented();
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span>New node!</span>' +
        '<span></span></p></div>',
    );
  });

  test('insertBefore() (inert)', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const newTextNode = Outline.createTextNode('New node!');
      newTextNode.makeInert();
      textNode.insertBefore(newTextNode);
    });
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
        '<span style="pointer-events: none; user-select: none;">New node!</span>' +
        '<span></span></p></div>',
    );
  });

  test('isParentOf', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      expect(view.getRoot().isParentOf(textNode));
      expect(view.getRoot().getFirstChild().isParentOf(textNode));
    });
  });

  test('getCommonAncestor()', async () => {
    await update((view) => {
      const textNode = view.getRoot().getFirstChild().getFirstChild();
      const textNode2 = Outline.createTextNode('New node!');
      textNode.insertAfter(textNode2);
      // Our common ancestor here isn't the paragraph node, it's a writable clone.
      // Let's commit this update and test getCommonAncestor on a fresh view.
      const secondParagraph = ParagraphNodeModule.createParagraphNode();
      const textNode3 = Outline.createTextNode('Another node!');
      secondParagraph.append(textNode3);
      view.getRoot().getFirstChild().insertAfter(secondParagraph);
      // Structure is now:
      // root - p - ''
      //  |     ' - 'New node!'
      //  ' --- p - 'Another node!'
    });

    await update((view) => {
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
