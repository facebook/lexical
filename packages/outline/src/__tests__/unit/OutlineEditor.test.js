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

import {createEditor, createTextNode, TextNode} from 'outline';
import {createParagraphNode, ParagraphNode} from 'outline/ParagraphNode';
import useOutlineRichText from 'outline-react/useOutlineRichText';

function sanitizeHTML(html) {
  // Remove zero width characters
  return html.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
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

    jest.restoreAllMocks();
  });

  function useOutlineEditor(rootElementRef) {
    const editor = React.useMemo(() => createEditor(), []);

    React.useEffect(() => {
      const rootElement = rootElementRef.current;

      editor.setRootElement(rootElement);
    }, [rootElementRef, editor]);

    return editor;
  }

  let editor = null;

  function init() {
    const ref = React.createRef();

    function TestBase() {
      editor = useOutlineEditor(ref);
      editor.addListener('error', (error) => {
        throw error;
      });
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

  it('Should be able to update a view model without an root element', () => {
    const ref = React.createRef();

    function TestBase({element}) {
      editor = React.useMemo(() => createEditor(), []);

      React.useEffect(() => {
        editor.setRootElement(element);
      }, [element]);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase element={null} />, container);
    });

    editor.update((view) => {
      const root = view.getRoot();
      const paragraph = createParagraphNode();
      const text = createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    expect(container.innerHTML).toBe('<div contenteditable="true"></div>');

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase element={ref.current} />, container);
    });

    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span>This works!</span></p></div>',
    );
  });

  it('Should be able to handle a change in root element', async () => {
    const listener = jest.fn();

    function TestBase({changeElement}) {
      editor = React.useMemo(() => createEditor(), []);

      React.useEffect(() => {
        editor.update((view) => {
          const paragraph = createParagraphNode();
          const text = createTextNode(
            changeElement ? 'Change successful' : 'Not changed',
          );
          paragraph.append(text);
          view.getRoot().append(paragraph);
        });
      }, [changeElement]);

      React.useEffect(() => {
        editor.addListener('root', listener);
      }, []);

      const ref = React.useCallback((node) => {
        editor.setRootElement(node);
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

    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span>Not changed</span></p></div>',
    );

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase changeElement={true} />, container);
    });

    // Let Outline update
    await Promise.resolve().then();

    expect(listener).toHaveBeenCalledTimes(3);
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<span contenteditable="true" data-outline-editor="true"><p><span>Change successful</span></p></span>',
    );
  });

  describe('With node decorators', () => {
    function useDecorators() {
      const [decorators, setDecorators] = React.useState(() =>
        editor.getDecorators(),
      );
      // Subscribe to changes
      React.useEffect(() => {
        return editor.addListener('decorator', (nextDecorators) => {
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
      const listener = jest.fn();

      function Decorator({text}) {
        return <span>{text}</span>;
      }

      function Test() {
        editor = React.useMemo(() => createEditor(), []);

        React.useEffect(() => {
          editor.addListener('root', listener);
        }, []);

        const ref = React.useCallback((node) => {
          editor.setRootElement(node);
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
        class DecoratorNode extends TextNode {
          clone() {
            const node = new DecoratorNode(this.__text, this.__key);
            node.__parent = this.__parent;
            node.__flags = this.__flags;
            return node;
          }
          decorate() {
            return <Decorator text={'Hello world'} />;
          }
        }
        await editor.update((view) => {
          const paragraph = createParagraphNode();
          const text = new DecoratorNode('');
          text.makeImmutable();
          paragraph.append(text);
          view.getRoot().append(paragraph);
        });
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span></span>' +
          '<span><span>Hello world</span></span><span></span></p></div>',
      );
    });

    it('Should correctly render React component into Outline node', async () => {
      const listener = jest.fn();

      function Test({divKey}) {
        editor = React.useMemo(() => createEditor(), []);
        useOutlineRichText(editor, false);

        React.useEffect(() => {
          editor.addListener('root', listener);
        }, []);

        const ref = React.useCallback((node) => {
          editor.setRootElement(node);
        }, []);

        return <div key={divKey} ref={ref} contentEditable={true} />;
      }

      ReactTestUtils.act(() => {
        ReactDOM.render(<Test divKey={0} />, container);
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"></div>',
      );

      ReactTestUtils.act(() => {
        ReactDOM.render(<Test divKey={1} />, container);
      });
      expect(listener).toHaveBeenCalledTimes(3);
      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"></div>',
      );
      // Wait for update to complete
      await Promise.resolve().then();

      editor.getViewModel().read((view) => {
        const root = view.getRoot();
        const paragraph = root.getFirstChild();
        const text = paragraph.getFirstChild();

        expect(root).toEqual({
          __children: [paragraph.getKey()],
          __flags: 0,
          __key: 'root',
          __parent: null,
          __type: 'root',
        });
        expect(paragraph).toEqual({
          __children: [text.getKey()],
          __flags: 0,
          __key: paragraph.getKey(),
          __parent: 'root',
          __type: 'paragraph',
        });
        expect(text).toEqual({
          __text: '',
          __flags: 0,
          __key: text.getKey(),
          __parent: paragraph.getKey(),
          __type: 'text',
        });
      });
    });
  });

  describe('With root element', () => {
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
          const paragraph = createParagraphNode();
          originalText = createTextNode('Hello world');
          originalText.select(6, 11);
          paragraph.append(originalText);
          view.getRoot().append(paragraph);
        });
        editor.registerNodeType('paragraph', ParagraphNode);
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
  });
});
