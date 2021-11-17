/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {OutlineEditor, State} from 'outline';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {
  createEditor,
  createTextNode,
  TextNode,
  DecoratorNode,
  BlockNode,
  noSideEffectsFlushSync,
} from 'outline';
import {createParagraphNode, ParagraphNode} from 'outline/ParagraphNode';
import useOutlineRichText from 'outline-react/useOutlineRichText';
import {getEditorStateTextContent, getNodeByKey} from '../../core/OutlineUtils';
import {createTestBlockNode} from '../utils';

describe('OutlineEditor tests', () => {
  let container = null;
  let reactRoot;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = ReactDOM.createRoot(container);
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
      reactRoot.render(<TestBase />);
    });
  }

  async function update(fn) {
    editor.update(fn);
    return Promise.resolve().then();
  }

  it('Should be create and editor with an initial editor state', async () => {
    const rootElement = document.createElement('div');
    container.appendChild(rootElement);

    const initialEditor = createEditor();

    initialEditor.update((state) => {
      const root = state.getRoot();
      const paragraph = createParagraphNode();
      const text = createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    initialEditor.setRootElement(rootElement);

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );

    const initialEditorState = initialEditor.getEditorState();

    initialEditor.setRootElement(null);
    expect(container.innerHTML).toBe('<div data-outline-editor="true"></div>');

    editor = createEditor({
      initialEditorState: initialEditorState,
    });
    editor.setRootElement(rootElement);

    expect(editor.getEditorState()).toEqual(initialEditorState);
    expect(container.innerHTML).toBe(
      '<div data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );
  });

  it('Should handle nested updates in the correct sequence', async () => {
    const rootElement = document.createElement('div');
    let log = [];
    container.appendChild(rootElement);

    editor = createEditor();
    editor.addListener('error', (e) => {
      throw e;
    });

    editor.setRootElement(rootElement);

    editor.update((state) => {
      const root = state.getRoot();
      const paragraph = createParagraphNode();
      const text = createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    editor.update(
      (state) => {
        log.push('A1');
        // To enforce the update
        state.getRoot().markDirty();
        editor.update(
          () => {
            log.push('B1');
            editor.update(
              () => {
                log.push('C1');
              },
              () => {
                log.push('F1');
              },
            );
          },
          () => {
            log.push('E1');
          },
        );
      },
      () => {
        log.push('D1');
      },
    );

    // Wait for update to complete
    await Promise.resolve().then();

    expect(log).toEqual(['A1', 'B1', 'C1', 'D1', 'E1', 'F1']);
    log = [];

    editor.update(
      (state) => {
        log.push('A2');
        // To enforce the update
        state.getRoot().markDirty();
      },
      () => {
        log.push('B2');
        editor.update(
          (state) => {
            // force flush sync
            state.setCompositionKey('root');
            log.push('D2');
          },
          () => {
            log.push('F2');
          },
        );
        log.push('C2');
        editor.update(
          () => {
            log.push('E2');
          },
          () => {
            log.push('G2');
          },
        );
      },
    );

    // Wait for update to complete
    await Promise.resolve().then();

    expect(log).toEqual(['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2']);
    log = [];

    editor.addTransform('text', () => {
      log.push('TextTransform A3');
      editor.update(
        () => {
          log.push('TextTransform B3');
        },
        () => {
          log.push('TextTransform C3');
        },
      );
    });

    // Wait for update to complete
    await Promise.resolve().then();

    expect(log).toEqual([
      'TextTransform A3',
      'TextTransform B3',
      'TextTransform C3',
    ]);
    log = [];

    editor.update(
      (state) => {
        log.push('A3');
        state.getRoot().getLastDescendant().markDirty();
      },
      () => {
        log.push('B3');
      },
    );

    // Wait for update to complete
    await Promise.resolve().then();

    expect(log).toEqual([
      'A3',
      'TextTransform A3',
      'TextTransform B3',
      'B3',
      'TextTransform C3',
    ]);
  });

  it('Should be able to update an editor state without an root element', () => {
    const ref = React.createRef();

    function TestBase({element}) {
      editor = React.useMemo(() => createEditor(), []);

      React.useEffect(() => {
        editor.setRootElement(element);
      }, [element]);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={null} />);
    });

    editor.update((state) => {
      const root = state.getRoot();
      const paragraph = createParagraphNode();
      const text = createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    expect(container.innerHTML).toBe('<div contenteditable="true"></div>');

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={ref.current} />);
    });

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );
  });

  it('Should be able to recover from an update error', async () => {
    function TestBase() {
      editor = React.useMemo(() => createEditor(), []);

      const ref = React.useCallback((node) => {
        editor.setRootElement(node);
      }, []);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={null} />);
    });

    editor.update((state) => {
      const root = state.getRoot();
      if (root.getFirstChild() === null) {
        const paragraph = createParagraphNode();
        const text = createTextNode('This works!');
        root.append(paragraph);
        paragraph.append(text);
      }
    });

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );

    const listener = jest.fn();
    editor.addListener('error', listener);

    expect(listener).toHaveBeenCalledTimes(0);

    editor.update((state) => {
      const root = state.getRoot();
      root
        .getFirstChild()
        .getFirstChild()
        .getFirstChild()
        .setTextContent('Foo');
    });

    expect(listener).toHaveBeenCalledTimes(1);

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );
  });

  it('Should be able to recover from an update error with noSideEffectsFlushSync', async () => {
    function TestBase() {
      editor = React.useMemo(() => createEditor(), []);

      const ref = React.useCallback((node) => {
        editor.setRootElement(node);
      }, []);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={null} />);
    });

    noSideEffectsFlushSync(editor, () => {
      editor.update((state) => {
        const root = state.getRoot();
        if (root.getFirstChild() === null) {
          const paragraph = createParagraphNode();
          const text = createTextNode('This works!');
          root.append(paragraph);
          paragraph.append(text);
        }
      });
    });
    editor.update((state) => {
      throw new Error('foo');
    });

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );
  });

  it('Should be able to recover from a transform error with noSideEffectsFlushSync', async () => {
    function TestBase() {
      editor = React.useMemo(() => createEditor(), []);

      const ref = React.useCallback((node) => {
        editor.setRootElement(node);
      }, []);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={null} />);
    });

    const removeTransform = editor.addTransform('text', (state) => {
      throw new Error('foo');
    });
    noSideEffectsFlushSync(editor, () => {
      editor.update((state) => {
        const root = state.getRoot();
        if (root.getFirstChild() === null) {
          const paragraph = createParagraphNode();
          const text = createTextNode('This works!');
          root.append(paragraph);
          paragraph.append(text);
        }
      });
    });
    removeTransform();

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );
  });

  it('Should be able to recover from a reconciliation error', async () => {
    function TestBase() {
      editor = React.useMemo(() => createEditor(), []);

      const ref = React.useCallback((node) => {
        editor.setRootElement(node);
      }, []);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={null} />);
    });

    editor.update((state) => {
      const root = state.getRoot();
      if (root.getFirstChild() === null) {
        const paragraph = createParagraphNode();
        const text = createTextNode('This works!');
        root.append(paragraph);
        paragraph.append(text);
      }
    });

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">This works!</span></p></div>',
    );

    const listener = jest.fn();
    editor.addListener('error', listener);

    expect(listener).toHaveBeenCalledTimes(0);

    editor.update((state) => {
      const root = state.getRoot();
      root.getFirstChild().getFirstChild().setTextContent('Foo');
    });

    expect(listener).toHaveBeenCalledTimes(0);

    // This is an intentional bug, to trigger the recovery
    editor._editorState._nodeMap = null;

    // Wait for update to complete
    await Promise.resolve().then();

    expect(listener).toHaveBeenCalledTimes(1);

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-outline-text="true">Foo</span></p></div>',
    );
  });

  it('Should be able to handle a change in root element', async () => {
    const rootListener = jest.fn();
    const updateListener = jest.fn();

    function TestBase({changeElement}) {
      editor = React.useMemo(() => createEditor(), []);

      React.useEffect(() => {
        editor.update((state) => {
          const root = state.getRoot();
          const firstChild = root.getFirstChild();
          const text = changeElement ? 'Change successful' : 'Not changed';
          if (firstChild === null) {
            const paragraph = createParagraphNode();
            const textNode = createTextNode(text);
            paragraph.append(textNode);
            root.append(paragraph);
          } else {
            const textNode = firstChild.getFirstChild();
            textNode.setTextContent(text);
          }
        });
      }, [changeElement]);

      React.useEffect(() => {
        return editor.addListener('root', rootListener);
      }, []);

      React.useEffect(() => {
        return editor.addListener('update', updateListener);
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

    await ReactTestUtils.act(() => {
      reactRoot.render(<TestBase changeElement={false} />);
    });

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">Not changed</span></p></div>',
    );

    await ReactTestUtils.act(() => {
      reactRoot.render(<TestBase changeElement={true} />);
    });

    expect(rootListener).toHaveBeenCalledTimes(3);
    expect(updateListener).toHaveBeenCalledTimes(3);
    expect(container.innerHTML).toBe(
      '<span contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-outline-text="true">Change successful</span></p></span>',
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

    it('Should correctly render React component into Outline node #1', async () => {
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
        reactRoot.render(<Test />);
      });

      // Update the editor with the decorator
      await ReactTestUtils.act(async () => {
        class TestNode extends DecoratorNode {
          static clone(node: TestNode) {
            return new TestNode(node.__key);
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
        await editor.update((state) => {
          const paragraph = createParagraphNode();
          const test = new TestNode();
          paragraph.append(test);
          state.getRoot().append(paragraph);
        });
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p>' +
          '<span data-outline-decorator="true"><span>Hello world</span></span><br></p></div>',
      );
    });

    it('Should correctly render React component into Outline node #2', async () => {
      const listener = jest.fn();

      function Test({divKey}) {
        editor = React.useMemo(() => createEditor(), []);
        useOutlineRichText(editor, false);

        React.useEffect(() => {
          editor.addListener('root', listener);
          editor.addListener('error', (error) => {
            throw error;
          });
        }, []);

        const ref = React.useCallback((node) => {
          editor.setRootElement(node);
        }, []);

        return <div key={divKey} ref={ref} contentEditable={true} />;
      }

      ReactTestUtils.act(() => {
        reactRoot.render(<Test divKey={0} />);
      });

      // Wait for update to complete
      await Promise.resolve().then();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><br></p></div>',
      );

      ReactTestUtils.act(() => {
        reactRoot.render(<Test divKey={1} />);
      });
      expect(listener).toHaveBeenCalledTimes(3);
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><br></p></div>',
      );
      // Wait for update to complete
      await Promise.resolve().then();

      editor.getEditorState().read((state) => {
        const root = state.getRoot();
        const paragraph = root.getFirstChild();

        expect(root).toEqual({
          __cachedText: '',
          __children: [paragraph.getKey()],
          __flags: 0,
          __format: 0,
          __indent: 0,
          __key: 'root',
          __parent: null,
          __type: 'root',
        });
        expect(paragraph).toEqual({
          __children: [],
          __flags: 0,
          __format: 0,
          __indent: 0,
          __key: paragraph.getKey(),
          __parent: 'root',
          __type: 'paragraph',
        });
      });
    });
  });

  describe('With root element', () => {
    beforeEach(() => {
      init();
    });

    describe('parseEditorState()', () => {
      let originalText;
      let parsedParagraph;
      let parsedRoot;
      let parsedSelection;
      let parsedText;
      let paragraphKey;
      let textKey;
      let parsedEditorState;

      beforeEach(async () => {
        await update((state) => {
          const paragraph = createParagraphNode();
          originalText = createTextNode('Hello world');
          originalText.select(6, 11);
          paragraph.append(originalText);
          state.getRoot().append(paragraph);
        });
        editor.registerNodeType('paragraph', ParagraphNode);
        const stringifiedEditorState = editor.getEditorState().stringify();
        parsedEditorState = editor.parseEditorState(stringifiedEditorState);
        parsedEditorState.read((state) => {
          parsedRoot = state.getRoot();
          parsedParagraph = parsedRoot.getFirstChild();
          paragraphKey = parsedParagraph.getKey();
          parsedText = parsedParagraph.getFirstChild();
          textKey = parsedText.getKey();
          parsedSelection = state.getSelection();
        });
      });

      it('Parses the nodes of a stringified editor state', async () => {
        expect(parsedRoot).toEqual({
          __cachedText: null,
          __children: [paragraphKey],
          __flags: 0,
          __format: 0,
          __indent: 0,
          __key: 'root',
          __parent: null,
          __type: 'root',
        });
        expect(parsedParagraph).toEqual({
          __children: [textKey],
          __flags: 0,
          __format: 0,
          __indent: 0,
          __key: paragraphKey,
          __parent: 'root',
          __type: 'paragraph',
        });
        expect(parsedText).toEqual({
          __text: 'Hello world',
          __flags: 0,
          __format: 0,
          __key: textKey,
          __parent: paragraphKey,
          __style: '',
          __type: 'text',
        });
      });

      it('Parses the text content of the editor state', async () => {
        expect(
          parsedEditorState.read((state) => state.getRoot().__cachedText),
        ).toBe(null);
        expect(
          parsedEditorState.read((state) => state.getRoot().getTextContent()),
        ).toBe('Hello world');
      });

      it('Parses the selection offsets of a stringified editor state', async () => {
        expect(parsedSelection.anchor.offset).toEqual(6);
        expect(parsedSelection.focus.offset).toEqual(11);
      });

      it('Remaps the selection keys of a stringified editor state', async () => {
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
      await update((state) => {
        const root = state.getRoot();
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
        await update((state: State) => {
          const writableParagraph: ParagraphNode = state
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
        expect(getEditorStateTextContent(editor.getEditorState())).toBe(
          previous.join(''),
        );

        // Next editor state
        const previousSet = new Set(previous);
        await update((state: State) => {
          const writableParagraph: ParagraphNode = state
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
              expect(state.getNodeByKey(nextKey)).toBe(null);
              textToKey.set(nextText, textNode.__key);
            } else {
              textNode = state.getNodeByKey(nextKey);
              expect(textNode.__text).toBe(nextText);
            }
            writableParagraph.__children.push(textNode.__key);
            previousSet.delete(nextText);
          }
          previousSet.forEach((previousText) => {
            const previousKey = textToKey.get(previousText);
            const textNode = state.getNodeByKey(previousKey);
            expect(textNode.__text).toBe(previousText);
            textNode.remove();
          });
        });
        // Expect text content + HTML to be correct
        expect(getEditorStateTextContent(editor.getEditorState())).toBe(
          next.join(''),
        );
        expect(container.innerHTML).toBe(
          `<div contenteditable="true" data-outline-editor="true"><p>${
            next.length > 0
              ? next
                  .map(
                    (text) => `<span data-outline-text="true">${text}</span>`,
                  )
                  .join('')
              : `<br>`
          }</p></div>`,
        );
        // Expect editorState to have the correct latest nodes
        editor.getEditorState().read((state: State) => {
          for (let i = 0; i < next.length; i++) {
            const nextText = next[i];
            const nextKey = textToKey.get(nextText);
            expect(state.getNodeByKey(nextKey)).not.toBe(null);
          }
          previousSet.forEach((previousText) => {
            const previousKey = textToKey.get(previousText);
            expect(state.getNodeByKey(previousKey)).toBe(null);
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

    it('moves node to different tree branches', async () => {
      function createBlockNodeWithText(text: string) {
        const blockNode = createTestBlockNode();
        const textNode = createTextNode(text);
        blockNode.append(textNode);
        return [blockNode, textNode];
      }

      let paragraphNodeKey;
      let blockNode1Key;
      let textNode1Key;
      let blockNode2Key;
      let textNode2Key;
      await update((state: State) => {
        const paragraph: ParagraphNode = state.getRoot().getFirstChild();
        paragraphNodeKey = paragraph.getKey();

        const [blockNode1, textNode1] = createBlockNodeWithText('A');
        blockNode1Key = blockNode1.getKey();
        textNode1Key = textNode1.getKey();

        const [blockNode2, textNode2] = createBlockNodeWithText('B');
        blockNode2Key = blockNode2.getKey();
        textNode2Key = textNode2.getKey();

        paragraph.append(blockNode1, blockNode2);
      });
      await update((state: State) => {
        const blockNode1: BlockNode = getNodeByKey(blockNode1Key);
        const blockNode2: TextNode = getNodeByKey(blockNode2Key);
        blockNode1.append(blockNode2);
      });
      const keys = [
        paragraphNodeKey,
        blockNode1Key,
        textNode1Key,
        blockNode2Key,
        textNode2Key,
      ];
      for (let i = 0; i < keys.length; i++) {
        expect(editor._editorState._nodeMap.has(keys[i])).toBe(true);
        expect(editor._keyToDOMMap.has(keys[i])).toBe(true);
      }
      expect(editor._editorState._nodeMap.size).toBe(keys.length + 1); // + root
      expect(editor._keyToDOMMap.size).toBe(keys.length + 1); // + root
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><div><span data-outline-text="true">A</span><div><span data-outline-text="true">B</span></div></div></p></div>',
      );
    });

    it('moves node to different tree branches (inverse)', async () => {
      function createBlockNodeWithText(text: string) {
        const blockNode = createTestBlockNode();
        const textNode = createTextNode(text);
        blockNode.append(textNode);
        return blockNode;
      }

      let blockNode1Key;
      let blockNode2Key;
      await update((state: State) => {
        const paragraph: ParagraphNode = state.getRoot().getFirstChild();

        const blockNode1 = createBlockNodeWithText('A');
        blockNode1Key = blockNode1.getKey();

        const blockNode2 = createBlockNodeWithText('B');
        blockNode2Key = blockNode2.getKey();

        paragraph.append(blockNode1, blockNode2);
      });
      await update((state: State) => {
        const blockNode1: BlockNode = getNodeByKey(blockNode1Key);
        const blockNode2: TextNode = getNodeByKey(blockNode2Key);
        blockNode2.append(blockNode1);
      });
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><div><span data-outline-text="true">B</span><div><span data-outline-text="true">A</span></div></div></p></div>',
      );
    });

    it('moves node to different tree branches (node appended twice in two different branches)', async () => {
      function createBlockNodeWithText(text: string) {
        const blockNode = createTestBlockNode();
        const textNode = createTextNode(text);
        blockNode.append(textNode);
        return blockNode;
      }

      let blockNode1Key;
      let blockNode2Key;
      let blockNode3Key;
      await update((state: State) => {
        const paragraph: ParagraphNode = state.getRoot().getFirstChild();

        const blockNode1 = createBlockNodeWithText('A');
        blockNode1Key = blockNode1.getKey();

        const blockNode2 = createBlockNodeWithText('B');
        blockNode2Key = blockNode2.getKey();

        const blockNode3 = createBlockNodeWithText('C');
        blockNode3Key = blockNode3.getKey();

        paragraph.append(blockNode1, blockNode2, blockNode3);
      });
      await update((state: State) => {
        const blockNode1: BlockNode = getNodeByKey(blockNode1Key);
        const blockNode2: TextNode = getNodeByKey(blockNode2Key);
        const blockNode3: TextNode = getNodeByKey(blockNode3Key);
        blockNode2.append(blockNode3);
        blockNode1.append(blockNode3);
      });
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-outline-editor="true"><p><div><span data-outline-text="true">A</span><div><span data-outline-text="true">C</span></div></div><div><span data-outline-text="true">B</span></div></p></div>',
      );
    });
  });
});
