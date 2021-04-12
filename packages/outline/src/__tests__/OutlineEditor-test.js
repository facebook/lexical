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

describe('OutlineEditor tests', () => {
  let container = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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

  it('Should be able to update a view model without an editor element', () => {
    const ref = React.createRef();

    function TestBase({element}) {
      editor = React.useMemo(() => Outline.createEditor(), []);

      React.useEffect(() => {
        editor.setEditorElement(element);
      }, [element]);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase element={null} />, container);
    });

    editor.update((view) => {
      const root = view.getRoot();
      const paragraph = ParagraphNodeModule.createParagraphNode();
      const text = Outline.createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    expect(container.innerHTML).toBe('<div contenteditable="true"></div>');

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase element={ref.current} />, container);
    });

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span>This works!</span></p></div>',
    );
  });

  it('Should be able to handle a change in editor element', async () => {
    function TestBase({changeElement}) {
      editor = React.useMemo(() => Outline.createEditor(), []);

      React.useEffect(() => {
        editor.update((view) => {
          const paragraph = ParagraphNodeModule.createParagraphNode();
          const text = Outline.createTextNode(
            changeElement ? 'Change successful' : 'Not changed',
          );
          paragraph.append(text);
          view.getRoot().append(paragraph);
        });
      }, [changeElement]);

      const ref = React.useCallback((node) => {
        editor.setEditorElement(node);
      }, []);

      return changeElement ? (
        <span ref={ref} contentEditable={true} />
      ) : (
        <div ref={ref} contentEditable={true} />
      );
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase changeElement={false} />, container);
    });

    // Let Outline update
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span>Not changed</span></p></div>',
    );

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase changeElement={true} />, container);
    });

    // Let Outline update
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<span contenteditable="true" data-outline-editor="true"><p dir="ltr"><span>Change successful</span></p></span>',
    );
  });

  describe('With node decorators', () => {
    function useDecorators() {
      const [decorators, setDecorators] = React.useState(() =>
        editor.getNodeDecorators(),
      );
      // Subscribe to changes
      React.useEffect(() => {
        return editor.addDecoratorListener((nextDecorators) => {
          setDecorators(nextDecorators);
        });
      }, []);
      const decoratedPortals = React.useMemo(
        () =>
          Object.keys(decorators).map((nodeKey) => {
            const reactDecorator = decorators[nodeKey];
            const element = editor.getElementByKey(nodeKey);
            return ReactDOM.createPortal(reactDecorator, element);
          }),
        [decorators],
      );
      return decoratedPortals;
    }

    it('Should correctly render React component into Outline node', async () => {
      function Decorator({text}) {
        return <span>{text}</span>;
      }

      function Test() {
        editor = React.useMemo(() => Outline.createEditor(), []);

        const ref = React.useCallback((node) => {
          editor.setEditorElement(node);
        }, []);

        const decorators = useDecorators();

        return (
          <>
            <div ref={ref} contentEditable={true} />
            {decorators}
          </>
        );
      }

      ReactTestUtils.act(() => {
        ReactDOM.render(<Test />, container);
      });

      // Update the editor with the decorator
      await ReactTestUtils.act(async () => {
        await editor.update((view) => {
          const paragraph = ParagraphNodeModule.createParagraphNode();
          const text = Outline.createTextNode('');
          text.makeImmutable();
          editor.addNodeDecorator(
            text.getKey(),
            <Decorator text={'Hello world'} />,
          );
          paragraph.append(text);
          view.getRoot().append(paragraph);
        });
      });

      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
          '<span><span>Hello world</span></span><span></span></p></div>',
      );
    });
  });

  describe('With editor element', () => {
    beforeEach(() => {
      init();
    });

    describe('parseViewModel()', () => {
      let originalText;
      let parsedParagraph;
      let parsedRoot;
      let parsedSelection;
      let parsedText;
      let paragraphKey;
      let textKey;

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
          paragraphKey = parsedParagraph.getKey();
          parsedText = parsedParagraph.getFirstChild();
          textKey = parsedText.getKey();
          parsedSelection = view.getSelection();
        });
      });

      it('Parses the nodes of a stringified view model', async () => {
        expect(parsedRoot).toEqual({
          __children: [paragraphKey],
          __flags: 0,
          __key: 'root',
          __parent: null,
          __type: 'root',
        });
        expect(parsedParagraph).toEqual({
          __children: [textKey],
          __flags: 0,
          __key: paragraphKey,
          __parent: 'root',
          __type: 'paragraph',
        });
        expect(parsedText).toEqual({
          __text: 'Hello world',
          __flags: 0,
          __key: textKey,
          __parent: paragraphKey,
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
            'Placeholder text</div><p><span></span></p></div>',
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
          '<div contenteditable="true" data-outline-editor="true"><p><span></span></p><p>' +
            '<span></span></p></div>',
        );
      });
    });

    describe('addNodeType()', () => {
      it('Supports adding and removing the same node type', async () => {
        await update((view) => {
          const paragraph = ParagraphNodeModule.createParagraphNode();
          const text = Outline.createTextNode('Hello world');
          text.select(6, 11);
          paragraph.append(text);
          view.getRoot().append(paragraph);
        });

        const remove = editor.addNodeType(
          'paragraph',
          ParagraphNodeModule.ParagraphNode,
        );
        editor.addNodeType('paragraph', ParagraphNodeModule.ParagraphNode);
        // Remove the first added node type
        remove();
        // Parse the view model
        const stringifiedViewModel = editor.getViewModel().stringify();
        editor.parseViewModel(stringifiedViewModel);
      });
    });
  });
});
