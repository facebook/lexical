/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {OutlineEditor, View} from 'outline';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {createEditor, createTextNode, TextNode, DecoratorNode} from 'outline';
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

  let editor: OutlineEditor = null;

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
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
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
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">Not changed</span></p></div>',
    );

    ReactTestUtils.act(() => {
      ReactDOM.render(<TestBase changeElement={true} />, container);
    });

    // Let Outline update
    await Promise.resolve().then();

    expect(listener).toHaveBeenCalledTimes(3);
    expect(sanitizeHTML(container.innerHTML)).toBe(
      '<span contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">Change successful</span></p></span>',
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
        class TestNode extends DecoratorNode {
          static deserialize() {
            // TODO
          }
          clone() {
            return new TestNode(this.__key);
          }
          getTextContent() {
            return 'Hello world';
          }
          createDOM() {
            return document.createElement('span');
          }
          decorate() {
            return <Decorator text={'Hello world'} />;
          }
        }
        await editor.update((view) => {
          const paragraph = createParagraphNode();
          const test = new TestNode();
          paragraph.append(test);
          view.getRoot().append(paragraph);
        });
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(sanitizeHTML(container.innerHTML)).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true"></span>' +
          '<span data-outline-decorator="true"><span>Hello world</span></span><span data-outline-text="true"></span></p></div>',
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
        expect(parsedSelection.anchor.offset).toEqual(6);
        expect(parsedSelection.focus.offset).toEqual(11);
      });

      it('Remaps the selection keys of a stringified view model', async () => {
        expect(parsedSelection.anchor.key).not.toEqual(originalText.__key);
        expect(parsedSelection.focus.key).not.toEqual(originalText.__key);
        expect(parsedSelection.anchor.key).toEqual(parsedText.__key);
        expect(parsedSelection.focus.key).toEqual(parsedText.__key);
      });
    });
  });

  describe('Node children', () => {
    beforeEach(async () => {
      init();
      await reset();
    });

    async function reset() {
      init();
      await update((view) => {
        const root = view.getRoot();
        const paragraph = createParagraphNode();
        root.append(paragraph);
      });
    }

    function generatePermutations(maxLen: number): string[] {
      if (maxLen > 26) {
        throw new Error('maxLen <= 26');
      }

      const result = [];
      const current = [];
      const seen = new Set();

      (function permutationsImpl() {
        if (current.length > maxLen) {
          return;
        }

        result.push(current.slice());

        for (let i = 0; i < maxLen; i++) {
          const key = String(String.fromCharCode('a'.charCodeAt(0) + i));
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          current.push(key);
          permutationsImpl();
          seen.delete(key);
          current.pop();
        }
      })();

      return result;
    }

    it('adds/removes/updates children', async () => {
      async function forPreviousNext(previous: string[], next: string[]) {
        const textToKey: Map<string, NodeKey> = new Map();

        // Previous editor state
        await update((view: View) => {
          const writableParagraph: ParagraphNode = view
            .getRoot()
            .getFirstChild()
            .getWritable();
          writableParagraph.__children = [];
          for (let i = 0; i < previous.length; i++) {
            const previousText = previous[i];
            const textNode = new TextNode(previousText).toggleUnmergeable();
            textNode.__parent = writableParagraph.__key;
            writableParagraph.__children.push(textNode.__key);
            textToKey.set(previousText, textNode.__key);
          }
        });
        expect(editor.getTextContent()).toBe(previous.join(''));

        // Next editor state
        const previousSet = new Set(previous);
        await update((view: View) => {
          const writableParagraph: ParagraphNode = view
            .getRoot()
            .getFirstChild()
            .getWritable();
          writableParagraph.__children = [];
          for (let i = 0; i < next.length; i++) {
            const nextText = next[i];
            const nextKey = textToKey.get(nextText);
            let textNode;
            if (nextKey === undefined) {
              textNode = new TextNode(nextText).toggleUnmergeable();
              textNode.__parent = writableParagraph.__key;
              expect(view.getNodeByKey(nextKey)).toBe(null);
              textToKey.set(nextText, textNode.__key);
            } else {
              textNode = view.getNodeByKey(nextKey);
              expect(textNode.__text).toBe(nextText);
            }
            writableParagraph.__children.push(textNode.__key);
            previousSet.delete(nextText);
          }
          previousSet.forEach((previousText) => {
            const previousKey = textToKey.get(previousText);
            const textNode = view.getNodeByKey(previousKey);
            expect(textNode.__text).toBe(previousText);
            textNode.remove();
          });
        });
        // Expect text content + HTML to be correct
        expect(editor.getTextContent()).toBe(next.join(''));
        expect(container.innerHTML).toBe(
          `<div contenteditable="true" data-outline-editor="true"><p>${next
            .map((text) => `<span data-outline-text="true">${text}</span>`)
            .join('')}</p></div>`,
        );
        // Expect viewModel to have the correct latest nodes
        editor.getViewModel().read((view: View) => {
          for (let i = 0; i < next.length; i++) {
            const nextText = next[i];
            const nextKey = textToKey.get(nextText);
            expect(view.getNodeByKey(nextKey)).not.toBe(null);
          }
          previousSet.forEach((previousText) => {
            const previousKey = textToKey.get(previousText);
            expect(view.getNodeByKey(previousKey)).toBe(null);
          });
        });
      }

      const permutations = generatePermutations(4);
      for (let i = 0; i < permutations.length; i++) {
        for (let j = 0; j < permutations.length; j++) {
          await forPreviousNext(permutations[i], permutations[j]);
          await reset();
        }
      }
    });
  });
});
