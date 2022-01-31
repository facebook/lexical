/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {
  $createTextNode,
  TextNode,
  ElementNode,
  $getRoot,
  $setCompositionKey,
  $getSelection,
  $getNodeByKey,
  $isTextNode,
} from 'lexical';
import {$createParagraphNode, ParagraphNode} from 'lexical/ParagraphNode';
import useLexicalRichText from '@lexical/react/DEPRECATED_useLexicalRichText';
import {getEditorStateTextContent} from '../../LexicalUtils';
import {
  $createTestElementNode,
  $createTestDecoratorNode,
  createTestEditor,
} from '../utils';
import {HorizontalRuleNode} from '../../nodes/base/LexicalHorizontalRuleNode';
import {LineBreakNode} from '../../nodes/base/LexicalLineBreakNode';
import {RootNode} from '../../nodes/base/LexicalRootNode';

describe('LexicalEditor tests', () => {
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

  function useLexicalEditor(rootElementRef) {
    const editor = React.useMemo(
      () =>
        createTestEditor({
          theme: {
            text: {
              bold: 'editor-text-bold',
              italic: 'editor-text-italic',
              underline: 'editor-text-underline',
            },
          },
        }),
      [],
    );

    React.useEffect(() => {
      const rootElement = rootElementRef.current;

      editor.setRootElement(rootElement);
    }, [rootElementRef, editor]);

    return editor;
  }

  let editor: LexicalEditor = null;

  function init(onError: (error) => void) {
    const ref = React.createRef();

    function TestBase() {
      editor = useLexicalEditor(ref);
      editor.addListener('error', (error) => {
        if (onError) {
          onError(error);
        } else {
          throw error;
        }
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

    const initialEditor = createTestEditor();

    initialEditor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const text = $createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    initialEditor.setRootElement(rootElement);

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );

    const initialEditorState = initialEditor.getEditorState();

    initialEditor.setRootElement(null);
    expect(container.innerHTML).toBe('<div data-lexical-editor="true"></div>');

    editor = createTestEditor({
      initialEditorState: initialEditorState,
    });
    editor.setRootElement(rootElement);

    expect(editor.getEditorState()).toEqual(initialEditorState);
    expect(container.innerHTML).toBe(
      '<div data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );
  });

  it('Should handle nested updates in the correct sequence', async () => {
    init();
    let log = [];

    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const text = $createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    editor.update(
      () => {
        log.push('A1');
        // To enforce the update
        $getRoot().markDirty();
        editor.update(
          () => {
            log.push('B1');
            editor.update(
              () => {
                log.push('C1');
              },
              {
                onUpdate: () => {
                  log.push('F1');
                },
              },
            );
          },
          {
            onUpdate: () => {
              log.push('E1');
            },
          },
        );
      },
      {
        onUpdate: () => {
          log.push('D1');
        },
      },
    );

    // Wait for update to complete
    await Promise.resolve().then();

    expect(log).toEqual(['A1', 'B1', 'C1', 'D1', 'E1', 'F1']);
    log = [];

    editor.update(
      () => {
        log.push('A2');
        // To enforce the update
        $getRoot().markDirty();
      },
      {
        onUpdate: () => {
          log.push('B2');
          editor.update(
            () => {
              // force flush sync
              $setCompositionKey('root');
              log.push('D2');
            },
            {
              onUpdate: () => {
                log.push('F2');
              },
            },
          );
          log.push('C2');
          editor.update(
            () => {
              log.push('E2');
            },
            {
              onUpdate: () => {
                log.push('G2');
              },
            },
          );
        },
      },
    );

    // Wait for update to complete
    await Promise.resolve().then();

    expect(log).toEqual(['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2']);
    log = [];

    editor.addTransform(TextNode, () => {
      log.push('TextTransform A3');
      editor.update(
        () => {
          log.push('TextTransform B3');
        },
        {
          onUpdate: () => {
            log.push('TextTransform C3');
          },
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
      () => {
        log.push('A3');
        $getRoot().getLastDescendant().markDirty();
      },
      {
        onUpdate: () => {
          log.push('B3');
        },
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

  it('update does not call onUpdate callback when no dirty nodes', () => {
    init();
    const fn = jest.fn();
    editor.update(
      () => {
        //
      },
      {
        onUpdate: fn,
      },
    );
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it('editor.focus() callback is called', async () => {
    init();
    await editor.update(() => {
      const root = $getRoot();
      root.append($createParagraphNode());
    });

    const fn = jest.fn();
    await editor.focus(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('Synchronously runs three transforms, two of them depend on the other', async () => {
    init();
    // 2. Add italics
    const italicsListener = editor.addTransform(TextNode, (node) => {
      if (
        node.getTextContent() === 'foo' &&
        node.hasFormat('bold') &&
        !node.hasFormat('italic')
      ) {
        node.toggleFormat('italic');
      }
    });
    // 1. Add bold
    const boldListener = editor.addTransform(TextNode, (node) => {
      if (node.getTextContent() === 'foo' && !node.hasFormat('bold')) {
        node.toggleFormat('bold');
      }
    });
    // 2. Add underline
    const underlineListener = editor.addTransform(TextNode, (node) => {
      if (
        node.getTextContent() === 'foo' &&
        node.hasFormat('bold') &&
        !node.hasFormat('underline')
      ) {
        node.toggleFormat('underline');
      }
    });
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.append($createTextNode('foo'));
    });
    italicsListener();
    boldListener();
    underlineListener();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><strong class="editor-text-bold editor-text-underline editor-text-italic" data-lexical-text="true">foo</strong></p></div>',
    );
  });

  it('Synchronously runs three transforms, two of them depend on the other (2)', async () => {
    await init();
    // Add transform makes everything dirty the first time (let's not leverage this here)
    const skipFirst = [true, true, true];

    // 2. (Block transform) Add text
    const testParagraphListener = editor.addTransform(
      ParagraphNode,
      (paragraph) => {
        if (skipFirst[0]) {
          skipFirst[0] = false;
          return;
        }
        if (paragraph.isEmpty()) {
          paragraph.append($createTextNode('foo'));
        }
      },
    );
    // 2. (Text transform) Add bold to text
    const boldListener = editor.addTransform(TextNode, (node) => {
      if (node.getTextContent() === 'foo' && !node.hasFormat('bold')) {
        node.toggleFormat('bold');
      }
    });
    // 3. (Block transform) Add italics to bold text
    const italicsListener = editor.addTransform(ParagraphNode, (paragraph) => {
      const child = paragraph.getLastDescendant();
      if (
        child !== null &&
        child.hasFormat('bold') &&
        !child.hasFormat('italic')
      ) {
        child.toggleFormat('italic');
      }
    });
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    });
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = root.getFirstChild();
      paragraph.markDirty();
    });
    testParagraphListener();
    boldListener();
    italicsListener();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><strong class="editor-text-bold editor-text-italic" data-lexical-text="true">foo</strong></p></div>',
    );
  });

  it('Synchronously runs three transforms, two of them depend on previously merged text content', async () => {
    const hasRun = [false, false, false];
    init();
    // 1. [Foo] into [<empty>,Fo,o,<empty>,!,<empty>]
    const fooListener = editor.addTransform(TextNode, (node) => {
      if (node.getTextContent() === 'Foo' && !hasRun[0]) {
        const [before, after] = node.splitText(2);
        before.insertBefore($createTextNode(''));
        after.insertAfter($createTextNode(''));
        after.insertAfter($createTextNode('!'));
        after.insertAfter($createTextNode(''));
        hasRun[0] = true;
      }
    });
    // 2. [Foo!] into [<empty>,Fo,o!,<empty>,!,<empty>]
    const megaFooListener = editor.addTransform(ParagraphNode, (paragraph) => {
      const child = paragraph.getFirstChild();
      if (
        $isTextNode(child) &&
        child.getTextContent() === 'Foo!' &&
        !hasRun[1]
      ) {
        const [before, after] = child.splitText(2);
        before.insertBefore($createTextNode(''));
        after.insertAfter($createTextNode(''));
        after.insertAfter($createTextNode('!'));
        after.insertAfter($createTextNode(''));
        hasRun[1] = true;
      }
    });
    // 3. [Foo!!] into formatted bold [<empty>,Fo,o!!,<empty>]
    const boldFooListener = editor.addTransform(TextNode, (node) => {
      if (node.getTextContent() === 'Foo!!' && !hasRun[2]) {
        node.toggleFormat('bold');
        const [before, after] = node.splitText(2);
        before.insertBefore($createTextNode(''));
        after.insertAfter($createTextNode(''));
        hasRun[2] = true;
      }
    });
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.append($createTextNode('Foo'));
    });
    fooListener();
    megaFooListener();
    boldFooListener();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Foo!!</strong></p></div>',
    );
  });

  it('text transform runs when node is removed', async () => {
    init();
    const executeTransform = jest.fn();
    let hasBeenRemoved = false;
    const removeListener = editor.addTransform(TextNode, (node) => {
      if (hasBeenRemoved) {
        executeTransform();
      }
    });
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.append(
        $createTextNode('Foo').toggleUnmergeable(),
        $createTextNode('Bar').toggleUnmergeable(),
      );
    });
    await editor.update(() => {
      $getRoot().getLastDescendant().remove();
      hasBeenRemoved = true;
    });
    expect(executeTransform).toHaveBeenCalledTimes(1);

    removeListener();
  });

  it('transforms only run on nodes that were explictly marked as dirty', async () => {
    init();
    let executeParagraphNodeTransform = () => {};
    let executeTextNodeTransform = () => {};
    const removeParagraphTransform = editor.addTransform(
      ParagraphNode,
      (node) => {
        executeParagraphNodeTransform();
      },
    );
    const removeTextNodeTransform = editor.addTransform(TextNode, (node) => {
      executeTextNodeTransform();
    });
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.append($createTextNode('Foo'));
    });
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = root.getFirstChild();
      const textNode = paragraph.getFirstChild();
      textNode.getWritable();
      executeParagraphNodeTransform = jest.fn();
      executeTextNodeTransform = jest.fn();
    });
    expect(executeParagraphNodeTransform).toHaveBeenCalledTimes(0);
    expect(executeTextNodeTransform).toHaveBeenCalledTimes(1);

    removeParagraphTransform();
    removeTextNodeTransform();
  });

  describe('transforms on siblings', () => {
    let textNodeKeys;
    let textTransformCount;
    let removeTransform;

    beforeEach(async () => {
      init();
      textNodeKeys = [];
      textTransformCount = [];
      await editor.update(() => {
        const root = $getRoot();
        const paragraph0 = $createParagraphNode();
        const paragraph1 = $createParagraphNode();
        const textNodes = [];
        for (let i = 0; i < 6; i++) {
          const node = $createTextNode(i).toggleUnmergeable();
          textNodes.push(node);
          textNodeKeys.push(node.getKey());
          textTransformCount[i] = 0;
        }
        root.append(paragraph0, paragraph1);
        paragraph0.append(...textNodes.slice(0, 3));
        paragraph1.append(...textNodes.slice(3));
      });
      removeTransform = editor.addTransform(TextNode, (node) => {
        textTransformCount[node.__text]++;
      });
    });

    afterEach(() => {
      removeTransform();
    });

    it('on remove', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1]);
        textNode1.remove();
      });
      expect(textTransformCount).toEqual([2, 1, 2, 1, 1, 1]);
    });

    it('on replace', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1]);
        const textNode4 = $getNodeByKey(textNodeKeys[4]);
        textNode4.replace(textNode1);
      });
      expect(textTransformCount).toEqual([2, 2, 2, 2, 1, 2]);
    });

    it('on insertBefore', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1]);
        const textNode4 = $getNodeByKey(textNodeKeys[4]);
        textNode4.insertBefore(textNode1);
      });
      expect(textTransformCount).toEqual([2, 2, 2, 2, 2, 1]);
    });

    it('on insertAfter', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1]);
        const textNode4 = $getNodeByKey(textNodeKeys[4]);
        textNode4.insertAfter(textNode1);
      });
      expect(textTransformCount).toEqual([2, 2, 2, 1, 2, 2]);
    });

    it('on splitText', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1]);
        textNode1.setTextContent('67');
        textNode1.splitText(1);
        textTransformCount.push(0, 0);
      });
      expect(textTransformCount).toEqual([2, 1, 2, 1, 1, 1, 1, 1]);
    });

    it('on append', async () => {
      await editor.update(() => {
        const paragraph1 = $getRoot().getFirstChild();
        paragraph1.append($createTextNode('6').toggleUnmergeable());
        textTransformCount.push(0);
      });
      expect(textTransformCount).toEqual([1, 1, 2, 1, 1, 1, 1]);
    });
  });

  it('Detects infinite recursivity on transforms', async () => {
    const errorListener = jest.fn();
    init(errorListener);

    const boldListener = editor.addTransform(TextNode, (node) => {
      node.toggleFormat('bold');
    });

    expect(errorListener).toHaveBeenCalledTimes(0);
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.append($createTextNode('foo'));
    });
    expect(errorListener).toHaveBeenCalledTimes(1);

    boldListener();
  });

  it('Should be able to update an editor state without a root element', () => {
    const ref = React.createRef();

    function TestBase({element}) {
      editor = React.useMemo(() => createTestEditor(), []);

      React.useEffect(() => {
        editor.setRootElement(element);
      }, [element]);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={null} />);
    });

    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const text = $createTextNode('This works!');
      root.append(paragraph);
      paragraph.append(text);
    });

    expect(container.innerHTML).toBe('<div contenteditable="true"></div>');

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase element={ref.current} />);
    });

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );
  });

  it('Should be able to recover from an update error', async () => {
    const errorListener = jest.fn();
    init(errorListener);

    editor.update(() => {
      const root = $getRoot();
      if (root.getFirstChild() === null) {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('This works!');
        root.append(paragraph);
        paragraph.append(text);
      }
    });

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );

    expect(errorListener).toHaveBeenCalledTimes(0);

    editor.update(() => {
      const root = $getRoot();
      root
        .getFirstChild()
        .getFirstChild()
        .getFirstChild()
        .setTextContent('Foo');
    });

    expect(errorListener).toHaveBeenCalledTimes(1);

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );
  });

  it('Should be able to recover from a reconciliation error', async () => {
    const errorListener = jest.fn();
    init(errorListener);

    editor.update(() => {
      const root = $getRoot();
      if (root.getFirstChild() === null) {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('This works!');
        root.append(paragraph);
        paragraph.append(text);
      }
    });

    // Wait for update to complete
    await Promise.resolve().then();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );

    expect(errorListener).toHaveBeenCalledTimes(0);

    editor.update(() => {
      const root = $getRoot();
      root.getFirstChild().getFirstChild().setTextContent('Foo');
    });

    expect(errorListener).toHaveBeenCalledTimes(0);

    // This is an intentional bug, to trigger the recovery
    editor._editorState._nodeMap = null;

    // Wait for update to complete
    await Promise.resolve().then();

    expect(errorListener).toHaveBeenCalledTimes(1);

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Foo</span></p></div>',
    );
  });

  it('Should be able to handle a change in root element', async () => {
    const rootListener = jest.fn();
    const updateListener = jest.fn();

    function TestBase({changeElement}) {
      editor = React.useMemo(() => createTestEditor(), []);

      React.useEffect(() => {
        editor.update(() => {
          const root = $getRoot();
          const firstChild = root.getFirstChild();
          const text = changeElement ? 'Change successful' : 'Not changed';
          if (firstChild === null) {
            const paragraph = $createParagraphNode();
            const textNode = $createTextNode(text);
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
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Not changed</span></p></div>',
    );

    await ReactTestUtils.act(() => {
      reactRoot.render(<TestBase changeElement={true} />);
    });

    expect(rootListener).toHaveBeenCalledTimes(3);
    expect(updateListener).toHaveBeenCalledTimes(3);
    expect(container.innerHTML).toBe(
      '<span contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Change successful</span></p></span>',
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

    it('Should correctly render React component into Lexical node #1', async () => {
      const listener = jest.fn();

      function Test() {
        editor = React.useMemo(() => createTestEditor(), []);

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
        await editor.update(() => {
          const paragraph = $createParagraphNode();
          const test = $createTestDecoratorNode();
          paragraph.append(test);
          $getRoot().append(paragraph);
        });
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-lexical-editor="true"><p>' +
          '<span data-lexical-decorator="true"><span>Hello world</span></span><br></p></div>',
      );
    });

    it('Should correctly render React component into Lexical node #2', async () => {
      const listener = jest.fn();

      function Test({divKey}) {
        editor = React.useMemo(() => createTestEditor(), []);
        useLexicalRichText(editor, false);

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
        '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
      );

      ReactTestUtils.act(() => {
        reactRoot.render(<Test divKey={1} />);
      });
      expect(listener).toHaveBeenCalledTimes(3);
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
      );
      // Wait for update to complete
      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();

        expect(root).toEqual({
          __cachedText: '',
          __children: [paragraph.getKey()],
          __dir: null,
          __format: 0,
          __indent: 0,
          __key: 'root',
          __parent: null,
          __type: 'root',
        });
        expect(paragraph).toEqual({
          __children: [],
          __dir: null,
          __format: 0,
          __indent: 0,
          __key: paragraph.getKey(),
          __parent: 'root',
          __type: 'paragraph',
        });
      });
    });
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
      init();
      await update(() => {
        const paragraph = $createParagraphNode();
        originalText = $createTextNode('Hello world');
        originalText.select(6, 11);
        paragraph.append(originalText);
        $getRoot().append(paragraph);
      });
      const stringifiedEditorState = JSON.stringify(
        editor.getEditorState().toJSON(),
      );
      parsedEditorState = editor.parseEditorState(stringifiedEditorState);
      parsedEditorState.read(() => {
        parsedRoot = $getRoot();
        parsedParagraph = parsedRoot.getFirstChild();
        paragraphKey = parsedParagraph.getKey();
        parsedText = parsedParagraph.getFirstChild();
        textKey = parsedText.getKey();
        parsedSelection = $getSelection();
      });
    });

    it('Parses the nodes of a stringified editor state', async () => {
      expect(parsedRoot).toEqual({
        __cachedText: null,
        __children: [paragraphKey],
        __dir: 'ltr',
        __format: 0,
        __indent: 0,
        __key: 'root',
        __parent: null,
        __type: 'root',
      });
      expect(parsedParagraph).toEqual({
        __children: [textKey],
        __dir: 'ltr',
        __format: 0,
        __indent: 0,
        __key: paragraphKey,
        __parent: 'root',
        __type: 'paragraph',
      });
      expect(parsedText).toEqual({
        __mode: 0,
        __detail: 0,
        __text: 'Hello world',
        __format: 0,
        __key: textKey,
        __parent: paragraphKey,
        __style: '',
        __type: 'text',
      });
    });

    it('Parses the text content of the editor state', async () => {
      expect(parsedEditorState.read(() => $getRoot().__cachedText)).toBe(null);
      expect(parsedEditorState.read(() => $getRoot().getTextContent())).toBe(
        'Hello world',
      );
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

  describe('Node children', () => {
    beforeEach(async () => {
      init();
      await reset();
    });

    async function reset() {
      init();
      await update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
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
          const writableParagraph: ParagraphNode = $getRoot()
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
        const nextSet = new Set(next);
        await update(() => {
          const writableParagraph: ParagraphNode = $getRoot()
            .getFirstChild()
            .getWritable();
          // Remove previous that are not in next
          for (let i = 0; i < previous.length; i++) {
            const previousText = previous[i];
            if (!nextSet.has(previousText)) {
              const previousKey = textToKey.get(previousText);
              const previousNode = $getNodeByKey(previousKey);
              previousNode.remove();
              textToKey.delete(previousText);
            }
          }
          for (let i = 0; i < next.length; i++) {
            const nextText = next[i];
            const nextKey = textToKey.get(nextText);
            let textNode;
            if (nextKey === undefined) {
              // New node; append to the end
              textNode = new TextNode(nextText).toggleUnmergeable();
              textNode.__parent = writableParagraph.__key;
              expect($getNodeByKey(nextKey)).toBe(null);
              textToKey.set(nextText, textNode.__key);
              writableParagraph.__children.push(textNode.__key);
            } else {
              // Node exists in previous; reorder it
              textNode = $getNodeByKey(nextKey);
              expect(textNode.__text).toBe(nextText);
              writableParagraph.__children.splice(
                writableParagraph.__children.indexOf(nextKey),
                1,
              );
              writableParagraph.__children.push(textNode.__key);
            }
          }
        });
        // Expect text content + HTML to be correct
        expect(getEditorStateTextContent(editor.getEditorState())).toBe(
          next.join(''),
        );
        expect(container.innerHTML.replace(/\sclass="*."/g, '')).toBe(
          `<div contenteditable="true" data-lexical-editor="true"><p${
            next.length > 0 ? ' dir="ltr"' : ''
          }>${
            next.length > 0
              ? next
                  .map(
                    (text) => `<span data-lexical-text="true">${text}</span>`,
                  )
                  .join('')
              : `<br>`
          }</p></div>`,
        );
        // Expect editorState to have the correct latest nodes
        editor.getEditorState().read(() => {
          for (let i = 0; i < next.length; i++) {
            const nextText = next[i];
            const nextKey = textToKey.get(nextText);
            expect($getNodeByKey(nextKey)).not.toBe(null);
          }
        });
        expect(editor.getEditorState()._nodeMap.size).toBe(next.length + 2);
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
      function createElementNodeWithText(text: string) {
        const elementNode = $createTestElementNode();
        const textNode = $createTextNode(text);
        elementNode.append(textNode);
        return [elementNode, textNode];
      }

      let paragraphNodeKey;
      let elementNode1Key;
      let textNode1Key;
      let elementNode2Key;
      let textNode2Key;
      await update(() => {
        const paragraph: ParagraphNode = $getRoot().getFirstChild();
        paragraphNodeKey = paragraph.getKey();

        const [elementNode1, textNode1] = createElementNodeWithText('A');
        elementNode1Key = elementNode1.getKey();
        textNode1Key = textNode1.getKey();

        const [elementNode2, textNode2] = createElementNodeWithText('B');
        elementNode2Key = elementNode2.getKey();
        textNode2Key = textNode2.getKey();

        paragraph.append(elementNode1, elementNode2);
      });
      await update(() => {
        const elementNode1: ElementNode = $getNodeByKey(elementNode1Key);
        const elementNode2: TextNode = $getNodeByKey(elementNode2Key);
        elementNode1.append(elementNode2);
      });
      const keys = [
        paragraphNodeKey,
        elementNode1Key,
        textNode1Key,
        elementNode2Key,
        textNode2Key,
      ];
      for (let i = 0; i < keys.length; i++) {
        expect(editor._editorState._nodeMap.has(keys[i])).toBe(true);
        expect(editor._keyToDOMMap.has(keys[i])).toBe(true);
      }
      expect(editor._editorState._nodeMap.size).toBe(keys.length + 1); // + root
      expect(editor._keyToDOMMap.size).toBe(keys.length + 1); // + root
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-lexical-editor="true"><p><div dir="ltr"><span data-lexical-text="true">A</span><div dir="ltr"><span data-lexical-text="true">B</span></div></div></p></div>',
      );
    });

    it('moves node to different tree branches (inverse)', async () => {
      function createElementNodeWithText(text: string) {
        const elementNode = $createTestElementNode();
        const textNode = $createTextNode(text);
        elementNode.append(textNode);
        return elementNode;
      }

      let elementNode1Key;
      let elementNode2Key;
      await update(() => {
        const paragraph: ParagraphNode = $getRoot().getFirstChild();

        const elementNode1 = createElementNodeWithText('A');
        elementNode1Key = elementNode1.getKey();

        const elementNode2 = createElementNodeWithText('B');
        elementNode2Key = elementNode2.getKey();

        paragraph.append(elementNode1, elementNode2);
      });
      await update((state: State) => {
        const elementNode1: ElementNode = $getNodeByKey(elementNode1Key);
        const elementNode2: TextNode = $getNodeByKey(elementNode2Key);
        elementNode2.append(elementNode1);
      });
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-lexical-editor="true"><p><div dir="ltr"><span data-lexical-text="true">B</span><div dir="ltr"><span data-lexical-text="true">A</span></div></div></p></div>',
      );
    });

    it('moves node to different tree branches (node appended twice in two different branches)', async () => {
      function createElementNodeWithText(text: string) {
        const elementNode = $createTestElementNode();
        const textNode = $createTextNode(text);
        elementNode.append(textNode);
        return elementNode;
      }

      let elementNode1Key;
      let elementNode2Key;
      let elementNode3Key;
      await update(() => {
        const paragraph: ParagraphNode = $getRoot().getFirstChild();

        const elementNode1 = createElementNodeWithText('A');
        elementNode1Key = elementNode1.getKey();

        const elementNode2 = createElementNodeWithText('B');
        elementNode2Key = elementNode2.getKey();

        const elementNode3 = createElementNodeWithText('C');
        elementNode3Key = elementNode3.getKey();

        paragraph.append(elementNode1, elementNode2, elementNode3);
      });
      await update((state: State) => {
        const elementNode1: ElementNode = $getNodeByKey(elementNode1Key);
        const elementNode2: TextNode = $getNodeByKey(elementNode2Key);
        const elementNode3: TextNode = $getNodeByKey(elementNode3Key);
        elementNode2.append(elementNode3);
        elementNode1.append(elementNode3);
      });
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" data-lexical-editor="true"><p><div dir="ltr"><span data-lexical-text="true">A</span><div dir="ltr"><span data-lexical-text="true">C</span></div></div><div dir="ltr"><span data-lexical-text="true">B</span></div></p></div>',
      );
    });
  });

  it('can register transforms before updates', async () => {
    init();
    const emptyTransform = () => {};
    const removeTextTransform = editor.addTransform(TextNode, emptyTransform);
    const removeParagraphTransform = editor.addTransform(
      ParagraphNode,
      emptyTransform,
    );
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    });
    removeTextTransform();
    removeParagraphTransform();
  });

  it('registers node type', () => {
    init();

    const pairs = [
      ['text', TextNode],
      ['horizontal-rule', HorizontalRuleNode],
      ['linebreak', LineBreakNode],
      ['root', RootNode],
    ];
    for (let i = 0; i < pairs.length; i++) {
      const currentPair = pairs[i];
      expect(editor._registeredNodes.get(currentPair[0]).klass).toBe(
        currentPair[1],
      );
    }
    class CustomTextNode extends TextNode {
      static getType(): string {
        return 'custom_text_node';
      }
      static clone(key): CustomTextNode {
        return new CustomTextNode(key);
      }
    }

    expect(editor._registeredNodes.get('custom_text_node')).toBe(undefined);

    const unregisterNodes = editor.registerNodes([CustomTextNode]);
    expect(editor._registeredNodes.get('custom_text_node').klass).toBe(
      CustomTextNode,
    );
    unregisterNodes();
  });

  it('throws when overriding existing node type', () => {
    init();

    class CustomFirstTextNode extends TextNode {
      static getType(): string {
        return 'custom_text_node';
      }
      static clone(key): CustomTextNode {
        return new CustomTextNode(key);
      }
    }

    class CustomSecondTextNode extends TextNode {
      static getType(): string {
        return 'custom_text_node';
      }
      static clone(key): CustomTextNode {
        return new CustomTextNode(key);
      }
    }

    editor.registerNodes([CustomFirstTextNode]);
    expect(() => editor.registerNodes([CustomSecondTextNode])).toThrow();
    editor.update(() => {
      // eslint-disable-next-line no-new
      new CustomFirstTextNode();
      expect(() => new CustomSecondTextNode()).toThrow();
    });
  });

  it('registers the same node three times, unregisters it, and registers a different node with the same type', () => {
    init();

    class CustomFirstTextNode extends TextNode {
      static getType(): string {
        return 'custom_text_node';
      }
      static clone(key): CustomTextNode {
        return new CustomTextNode(key);
      }
    }

    class CustomSecondTextNode extends TextNode {
      static getType(): string {
        return 'custom_text_node';
      }
      static clone(key): CustomTextNode {
        return new CustomTextNode(key);
      }
    }

    const unregisterFn1 = editor.registerNodes([CustomFirstTextNode]);
    expect(editor._registeredNodes.get('custom_text_node').count).toBe(1);
    const unregisterFn2 = editor.registerNodes([
      CustomFirstTextNode,
      CustomFirstTextNode,
    ]);
    expect(editor._registeredNodes.get('custom_text_node').count).toBe(3);
    unregisterFn1();
    expect(editor._registeredNodes.get('custom_text_node').count).toBe(2);
    unregisterFn2();
    expect(editor._registeredNodes.get('custom_text_node')).toBe(undefined);

    editor.registerNodes([CustomSecondTextNode]);
    expect(editor._registeredNodes.get('custom_text_node').count).toBe(1);
    editor.update(() => {
      // eslint-disable-next-line no-new
      new CustomSecondTextNode();
    });
  });

  it('textcontent listener', async () => {
    init();
    const fn = jest.fn();
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('foo');
      root.append(paragraph);
      paragraph.append(textNode);
    });

    editor.addListener('textcontent', (text) => {
      fn(text);
    });
    await editor.update(() => {
      const root = $getRoot();
      const child = root.getLastDescendant();
      child.insertAfter($createTextNode('bar'));
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('foobar');
  });
});
