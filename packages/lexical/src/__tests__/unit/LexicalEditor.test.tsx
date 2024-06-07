/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isTextNode,
  $parseSerializedNode,
  $setCompositionKey,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  EditorState,
  ElementNode,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type LexicalNodeReplacement,
  ParagraphNode,
  RootNode,
  TextNode,
} from 'lexical';
import * as React from 'react';
import {
  createRef,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {createPortal} from 'react-dom';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';

import {
  $createTestDecoratorNode,
  $createTestElementNode,
  $createTestInlineElementNode,
  createTestEditor,
  TestComposer,
  TestTextNode,
} from '../utils';

describe('LexicalEditor tests', () => {
  let container: HTMLElement;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    // @ts-ignore
    container = null;

    jest.restoreAllMocks();
  });

  function useLexicalEditor(
    rootElementRef: React.RefObject<HTMLDivElement>,
    onError?: (error: Error) => void,
    nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>,
  ) {
    const editor = useMemo(
      () =>
        createTestEditor({
          nodes: nodes ?? [],
          onError: onError || jest.fn(),
          theme: {
            text: {
              bold: 'editor-text-bold',
              italic: 'editor-text-italic',
              underline: 'editor-text-underline',
            },
          },
        }),
      [onError, nodes],
    );

    useEffect(() => {
      const rootElement = rootElementRef.current;

      editor.setRootElement(rootElement);
    }, [rootElementRef, editor]);

    return editor;
  }

  let editor: LexicalEditor;

  function init(onError?: () => void) {
    const ref = createRef<HTMLDivElement>();

    function TestBase() {
      editor = useLexicalEditor(ref, onError);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase />);
    });
  }

  async function update(fn: () => void) {
    editor.update(fn);

    return Promise.resolve().then();
  }

  it('Should create an editor with an initial editor state', async () => {
    const rootElement = document.createElement('div');

    container.appendChild(rootElement);

    const initialEditor = createTestEditor({
      onError: jest.fn(),
    });

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
      '<div style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );

    const initialEditorState = initialEditor.getEditorState();
    initialEditor.setRootElement(null);

    expect(container.innerHTML).toBe(
      '<div style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"></div>',
    );

    editor = createTestEditor({
      editorState: initialEditorState,
      onError: jest.fn(),
    });
    editor.setRootElement(rootElement);

    expect(editor.getEditorState()).toEqual(initialEditorState);
    expect(container.innerHTML).toBe(
      '<div style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );
  });

  it('Should handle nested updates in the correct sequence', async () => {
    init();

    let log: Array<string> = [];

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
    editor.registerNodeTransform(TextNode, () => {
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
        $getRoot().getLastDescendant()!.markDirty();
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
    const italicsListener = editor.registerNodeTransform(TextNode, (node) => {
      if (
        node.getTextContent() === 'foo' &&
        node.hasFormat('bold') &&
        !node.hasFormat('italic')
      ) {
        node.toggleFormat('italic');
      }
    });

    // 1. Add bold
    const boldListener = editor.registerNodeTransform(TextNode, (node) => {
      if (node.getTextContent() === 'foo' && !node.hasFormat('bold')) {
        node.toggleFormat('bold');
      }
    });

    // 2. Add underline
    const underlineListener = editor.registerNodeTransform(TextNode, (node) => {
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
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><strong class="editor-text-bold editor-text-italic editor-text-underline" data-lexical-text="true">foo</strong></p></div>',
    );
  });

  it('Synchronously runs three transforms, two of them depend on the other (2)', async () => {
    await init();

    // Add transform makes everything dirty the first time (let's not leverage this here)
    const skipFirst = [true, true, true];

    // 2. (Block transform) Add text
    const testParagraphListener = editor.registerNodeTransform(
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
    const boldListener = editor.registerNodeTransform(TextNode, (node) => {
      if (node.getTextContent() === 'foo' && !node.hasFormat('bold')) {
        node.toggleFormat('bold');
      }
    });

    // 3. (Block transform) Add italics to bold text
    const italicsListener = editor.registerNodeTransform(
      ParagraphNode,
      (paragraph) => {
        const child = paragraph.getLastDescendant();

        if (
          $isTextNode(child) &&
          child.hasFormat('bold') &&
          !child.hasFormat('italic')
        ) {
          child.toggleFormat('italic');
        }
      },
    );

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    });

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = root.getFirstChild();
      paragraph!.markDirty();
    });

    testParagraphListener();
    boldListener();
    italicsListener();

    expect(container.innerHTML).toBe(
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><strong class="editor-text-bold editor-text-italic" data-lexical-text="true">foo</strong></p></div>',
    );
  });

  it('Synchronously runs three transforms, two of them depend on previously merged text content', async () => {
    const hasRun = [false, false, false];
    init();

    // 1. [Foo] into [<empty>,Fo,o,<empty>,!,<empty>]
    const fooListener = editor.registerNodeTransform(TextNode, (node) => {
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
    const megaFooListener = editor.registerNodeTransform(
      ParagraphNode,
      (paragraph) => {
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
      },
    );

    // 3. [Foo!!] into formatted bold [<empty>,Fo,o!!,<empty>]
    const boldFooListener = editor.registerNodeTransform(TextNode, (node) => {
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
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">Foo!!</strong></p></div>',
    );
  });

  it('text transform runs when node is removed', async () => {
    init();

    const executeTransform = jest.fn();
    let hasBeenRemoved = false;
    const removeListener = editor.registerNodeTransform(TextNode, (node) => {
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
      $getRoot().getLastDescendant()!.remove();
      hasBeenRemoved = true;
    });

    expect(executeTransform).toHaveBeenCalledTimes(1);

    removeListener();
  });

  it('transforms only run on nodes that were explicitly marked as dirty', async () => {
    init();

    let executeParagraphNodeTransform = () => {
      return;
    };

    let executeTextNodeTransform = () => {
      return;
    };

    const removeParagraphTransform = editor.registerNodeTransform(
      ParagraphNode,
      (node) => {
        executeParagraphNodeTransform();
      },
    );
    const removeTextNodeTransform = editor.registerNodeTransform(
      TextNode,
      (node) => {
        executeTextNodeTransform();
      },
    );

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.append($createTextNode('Foo'));
    });

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = root.getFirstChild() as ParagraphNode;
      const textNode = paragraph.getFirstChild() as TextNode;

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
    let textNodeKeys: string[];
    let textTransformCount: number[];
    let removeTransform: () => void;

    beforeEach(async () => {
      init();

      textNodeKeys = [];
      textTransformCount = [];

      await editor.update(() => {
        const root = $getRoot();
        const paragraph0 = $createParagraphNode();
        const paragraph1 = $createParagraphNode();
        const textNodes: Array<LexicalNode> = [];

        for (let i = 0; i < 6; i++) {
          const node = $createTextNode(String(i)).toggleUnmergeable();
          textNodes.push(node);
          textNodeKeys.push(node.getKey());
          textTransformCount[i] = 0;
        }

        root.append(paragraph0, paragraph1);
        paragraph0.append(...textNodes.slice(0, 3));
        paragraph1.append(...textNodes.slice(3));
      });

      removeTransform = editor.registerNodeTransform(TextNode, (node) => {
        textTransformCount[Number(node.__text)]++;
      });
    });

    afterEach(() => {
      removeTransform();
    });

    it('on remove', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1])!;
        textNode1.remove();
      });
      expect(textTransformCount).toEqual([2, 1, 2, 1, 1, 1]);
    });

    it('on replace', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1])!;
        const textNode4 = $getNodeByKey(textNodeKeys[4])!;
        textNode4.replace(textNode1);
      });
      expect(textTransformCount).toEqual([2, 2, 2, 2, 1, 2]);
    });

    it('on insertBefore', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1])!;
        const textNode4 = $getNodeByKey(textNodeKeys[4])!;
        textNode4.insertBefore(textNode1);
      });
      expect(textTransformCount).toEqual([2, 2, 2, 2, 2, 1]);
    });

    it('on insertAfter', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1])!;
        const textNode4 = $getNodeByKey(textNodeKeys[4])!;
        textNode4.insertAfter(textNode1);
      });
      expect(textTransformCount).toEqual([2, 2, 2, 1, 2, 2]);
    });

    it('on splitText', async () => {
      await editor.update(() => {
        const textNode1 = $getNodeByKey(textNodeKeys[1]) as TextNode;
        textNode1.setTextContent('67');
        textNode1.splitText(1);
        textTransformCount.push(0, 0);
      });
      expect(textTransformCount).toEqual([2, 1, 2, 1, 1, 1, 1, 1]);
    });

    it('on append', async () => {
      await editor.update(() => {
        const paragraph1 = $getRoot().getFirstChild() as ParagraphNode;
        paragraph1.append($createTextNode('6').toggleUnmergeable());
        textTransformCount.push(0);
      });
      expect(textTransformCount).toEqual([1, 1, 2, 1, 1, 1, 1]);
    });
  });

  it('Detects infinite recursivity on transforms', async () => {
    const errorListener = jest.fn();
    init(errorListener);

    const boldListener = editor.registerNodeTransform(TextNode, (node) => {
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
    const ref = createRef<HTMLDivElement>();

    function TestBase({element}: {element: HTMLElement | null}) {
      editor = useMemo(() => createTestEditor(), []);

      useEffect(() => {
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
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
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
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );
    expect(errorListener).toHaveBeenCalledTimes(0);

    editor.update(() => {
      const root = $getRoot();
      root
        .getFirstChild<ElementNode>()!
        .getFirstChild<ElementNode>()!
        .getFirstChild<TextNode>()!
        .setTextContent('Foo');
    });

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe(
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">This works!</span></p></div>',
    );
  });

  it('Should be able to handle a change in root element', async () => {
    const rootListener = jest.fn();
    const updateListener = jest.fn();

    function TestBase({changeElement}: {changeElement: boolean}) {
      editor = useMemo(() => createTestEditor(), []);

      useEffect(() => {
        editor.update(() => {
          const root = $getRoot();
          const firstChild = root.getFirstChild() as ParagraphNode | null;
          const text = changeElement ? 'Change successful' : 'Not changed';

          if (firstChild === null) {
            const paragraph = $createParagraphNode();
            const textNode = $createTextNode(text);
            paragraph.append(textNode);
            root.append(paragraph);
          } else {
            const textNode = firstChild.getFirstChild() as TextNode;
            textNode.setTextContent(text);
          }
        });
      }, [changeElement]);

      useEffect(() => {
        return editor.registerRootListener(rootListener);
      }, []);

      useEffect(() => {
        return editor.registerUpdateListener(updateListener);
      }, []);

      const ref = useCallback((node: HTMLElement | null) => {
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
      '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Not changed</span></p></div>',
    );

    await ReactTestUtils.act(() => {
      reactRoot.render(<TestBase changeElement={true} />);
    });

    expect(rootListener).toHaveBeenCalledTimes(3);
    expect(updateListener).toHaveBeenCalledTimes(3);
    expect(container.innerHTML).toBe(
      '<span contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Change successful</span></p></span>',
    );
  });

  for (const editable of [true, false]) {
    it(`Retains pendingEditor while rootNode is not set (${
      editable ? 'editable' : 'non-editable'
    })`, async () => {
      const JSON_EDITOR_STATE =
        '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"123","type":"text","version":1}],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
      init();
      const contentEditable = editor.getRootElement();
      editor.setEditable(editable);
      editor.setRootElement(null);
      const editorState = editor.parseEditorState(JSON_EDITOR_STATE);
      editor.setEditorState(editorState);
      editor.update(() => {
        //
      });
      editor.setRootElement(contentEditable);
      expect(JSON.stringify(editor.getEditorState().toJSON())).toBe(
        JSON_EDITOR_STATE,
      );
    });
  }

  describe('With node decorators', () => {
    function useDecorators() {
      const [decorators, setDecorators] = useState(() =>
        editor.getDecorators<ReactNode>(),
      );

      // Subscribe to changes
      useEffect(() => {
        return editor.registerDecoratorListener<ReactNode>((nextDecorators) => {
          setDecorators(nextDecorators);
        });
      }, []);

      const decoratedPortals = useMemo(
        () =>
          Object.keys(decorators).map((nodeKey) => {
            const reactDecorator = decorators[nodeKey];
            const element = editor.getElementByKey(nodeKey)!;

            return createPortal(reactDecorator, element);
          }),
        [decorators],
      );

      return decoratedPortals;
    }

    afterEach(async () => {
      // Clean up so we are not calling setState outside of act
      await ReactTestUtils.act(async () => {
        reactRoot.render(null);
        await Promise.resolve().then();
      });
    });

    it('Should correctly render React component into Lexical node #1', async () => {
      const listener = jest.fn();

      function Test() {
        editor = useMemo(() => createTestEditor(), []);

        useEffect(() => {
          editor.registerRootListener(listener);
        }, []);

        const ref = useCallback((node: HTMLDivElement | null) => {
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
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p>' +
          '<span data-lexical-decorator="true"><span>Hello world</span></span><br></p></div>',
      );
    });

    it('Should correctly render React component into Lexical node #2', async () => {
      const listener = jest.fn();

      function Test({divKey}: {divKey: number}): JSX.Element {
        function TestPlugin() {
          [editor] = useLexicalComposerContext();

          useEffect(() => {
            editor.registerRootListener(listener);
          }, []);

          return null;
        }

        return (
          <TestComposer>
            <RichTextPlugin
              contentEditable={
                // @ts-ignore
                // eslint-disable-next-line jsx-a11y/aria-role
                <ContentEditable key={divKey} role={null} spellCheck={null} />
              }
              placeholder={null}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <TestPlugin />
          </TestComposer>
        );
      }

      await ReactTestUtils.act(async () => {
        reactRoot.render(<Test divKey={0} />);
        // Wait for update to complete
        await Promise.resolve().then();
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><br></p></div>',
      );

      await ReactTestUtils.act(async () => {
        reactRoot.render(<Test divKey={1} />);
        // Wait for update to complete
        await Promise.resolve().then();
      });

      expect(listener).toHaveBeenCalledTimes(3);
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><br></p></div>',
      );

      // Wait for update to complete
      await Promise.resolve().then();

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild()!;
        expect(root).toEqual({
          __cachedText: '',
          __dir: null,
          __first: paragraph.getKey(),
          __format: 0,
          __indent: 0,
          __key: 'root',
          __last: paragraph.getKey(),
          __next: null,
          __parent: null,
          __prev: null,
          __size: 1,
          __type: 'root',
        });
        expect(paragraph).toEqual({
          __dir: null,
          __first: null,
          __format: 0,
          __indent: 0,
          __key: paragraph.getKey(),
          __last: null,
          __next: null,
          __parent: 'root',
          __prev: null,
          __size: 0,
          __textFormat: 0,
          __type: 'paragraph',
        });
      });
    });
  });

  describe('parseEditorState()', () => {
    let originalText: TextNode;
    let parsedParagraph: ParagraphNode;
    let parsedRoot: RootNode;
    let parsedText: TextNode;
    let paragraphKey: string;
    let textKey: string;
    let parsedEditorState: EditorState;

    it('exportJSON API - parses parsed JSON', async () => {
      await update(() => {
        const paragraph = $createParagraphNode();
        originalText = $createTextNode('Hello world');
        originalText.select(6, 11);
        paragraph.append(originalText);
        $getRoot().append(paragraph);
      });
      const stringifiedEditorState = JSON.stringify(editor.getEditorState());
      const parsedEditorStateFromObject = editor.parseEditorState(
        JSON.parse(stringifiedEditorState),
      );
      parsedEditorStateFromObject.read(() => {
        const root = $getRoot();
        expect(root.getTextContent()).toMatch(/Hello world/);
      });
    });

    describe('range selection', () => {
      beforeEach(async () => {
        await init();

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
          parsedParagraph = parsedRoot.getFirstChild() as ParagraphNode;
          paragraphKey = parsedParagraph.getKey();
          parsedText = parsedParagraph.getFirstChild() as TextNode;
          textKey = parsedText.getKey();
        });
      });

      it('Parses the nodes of a stringified editor state', async () => {
        expect(parsedRoot).toEqual({
          __cachedText: null,
          __dir: 'ltr',
          __first: paragraphKey,
          __format: 0,
          __indent: 0,
          __key: 'root',
          __last: paragraphKey,
          __next: null,
          __parent: null,
          __prev: null,
          __size: 1,
          __type: 'root',
        });
        expect(parsedParagraph).toEqual({
          __dir: 'ltr',
          __first: textKey,
          __format: 0,
          __indent: 0,
          __key: paragraphKey,
          __last: textKey,
          __next: null,
          __parent: 'root',
          __prev: null,
          __size: 1,
          __textFormat: 0,
          __type: 'paragraph',
        });
        expect(parsedText).toEqual({
          __detail: 0,
          __format: 0,
          __key: textKey,
          __mode: 0,
          __next: null,
          __parent: paragraphKey,
          __prev: null,
          __style: '',
          __text: 'Hello world',
          __type: 'text',
        });
      });

      it('Parses the text content of the editor state', async () => {
        expect(parsedEditorState.read(() => $getRoot().__cachedText)).toBe(
          null,
        );
        expect(parsedEditorState.read(() => $getRoot().getTextContent())).toBe(
          'Hello world',
        );
      });
    });

    describe('node selection', () => {
      beforeEach(async () => {
        init();

        await update(() => {
          const paragraph = $createParagraphNode();
          originalText = $createTextNode('Hello world');
          const selection = $createNodeSelection();
          selection.add(originalText.getKey());
          $setSelection(selection);
          paragraph.append(originalText);
          $getRoot().append(paragraph);
        });
        const stringifiedEditorState = JSON.stringify(
          editor.getEditorState().toJSON(),
        );
        parsedEditorState = editor.parseEditorState(stringifiedEditorState);
        parsedEditorState.read(() => {
          parsedRoot = $getRoot();
          parsedParagraph = parsedRoot.getFirstChild() as ParagraphNode;
          paragraphKey = parsedParagraph.getKey();
          parsedText = parsedParagraph.getFirstChild() as TextNode;
          textKey = parsedText.getKey();
        });
      });

      it('Parses the nodes of a stringified editor state', async () => {
        expect(parsedRoot).toEqual({
          __cachedText: null,
          __dir: 'ltr',
          __first: paragraphKey,
          __format: 0,
          __indent: 0,
          __key: 'root',
          __last: paragraphKey,
          __next: null,
          __parent: null,
          __prev: null,
          __size: 1,
          __type: 'root',
        });
        expect(parsedParagraph).toEqual({
          __dir: 'ltr',
          __first: textKey,
          __format: 0,
          __indent: 0,
          __key: paragraphKey,
          __last: textKey,
          __next: null,
          __parent: 'root',
          __prev: null,
          __size: 1,
          __textFormat: 0,
          __type: 'paragraph',
        });
        expect(parsedText).toEqual({
          __detail: 0,
          __format: 0,
          __key: textKey,
          __mode: 0,
          __next: null,
          __parent: paragraphKey,
          __prev: null,
          __style: '',
          __text: 'Hello world',
          __type: 'text',
        });
      });

      it('Parses the text content of the editor state', async () => {
        expect(parsedEditorState.read(() => $getRoot().__cachedText)).toBe(
          null,
        );
        expect(parsedEditorState.read(() => $getRoot().getTextContent())).toBe(
          'Hello world',
        );
      });
    });
  });

  describe('$parseSerializedNode()', () => {
    it('parses serialized nodes', async () => {
      const expectedTextContent = 'Hello world\n\nHello world';
      let actualTextContent: string;
      let root: RootNode;
      await update(() => {
        root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('Hello world'));
        root.append(paragraph);
      });
      const stringifiedEditorState = JSON.stringify(editor.getEditorState());
      const parsedEditorStateJson = JSON.parse(stringifiedEditorState);
      const rootJson = parsedEditorStateJson.root;
      await update(() => {
        const children = rootJson.children.map($parseSerializedNode);
        root = $getRoot();
        root.append(...children);
        actualTextContent = root.getTextContent();
      });
      expect(actualTextContent!).toEqual(expectedTextContent);
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

    it('moves node to different tree branches', async () => {
      function $createElementNodeWithText(text: string) {
        const elementNode = $createTestElementNode();
        const textNode = $createTextNode(text);
        elementNode.append(textNode);

        return [elementNode, textNode];
      }

      let paragraphNodeKey: string;
      let elementNode1Key: string;
      let textNode1Key: string;
      let elementNode2Key: string;
      let textNode2Key: string;

      await update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;
        paragraphNodeKey = paragraph.getKey();

        const [elementNode1, textNode1] = $createElementNodeWithText('A');
        elementNode1Key = elementNode1.getKey();
        textNode1Key = textNode1.getKey();

        const [elementNode2, textNode2] = $createElementNodeWithText('B');
        elementNode2Key = elementNode2.getKey();
        textNode2Key = textNode2.getKey();

        paragraph.append(elementNode1, elementNode2);
      });

      await update(() => {
        const elementNode1 = $getNodeByKey(elementNode1Key) as ElementNode;
        const elementNode2 = $getNodeByKey(elementNode2Key) as TextNode;
        elementNode1.append(elementNode2);
      });
      const keys = [
        paragraphNodeKey!,
        elementNode1Key!,
        textNode1Key!,
        elementNode2Key!,
        textNode2Key!,
      ];

      for (let i = 0; i < keys.length; i++) {
        expect(editor._editorState._nodeMap.has(keys[i])).toBe(true);
        expect(editor._keyToDOMMap.has(keys[i])).toBe(true);
      }

      expect(editor._editorState._nodeMap.size).toBe(keys.length + 1); // + root
      expect(editor._keyToDOMMap.size).toBe(keys.length + 1); // + root
      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><div dir="ltr"><span data-lexical-text="true">A</span><div dir="ltr"><span data-lexical-text="true">B</span></div></div></p></div>',
      );
    });

    it('moves node to different tree branches (inverse)', async () => {
      function $createElementNodeWithText(text: string) {
        const elementNode = $createTestElementNode();
        const textNode = $createTextNode(text);
        elementNode.append(textNode);

        return elementNode;
      }

      let elementNode1Key: string;
      let elementNode2Key: string;

      await update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;

        const elementNode1 = $createElementNodeWithText('A');
        elementNode1Key = elementNode1.getKey();

        const elementNode2 = $createElementNodeWithText('B');
        elementNode2Key = elementNode2.getKey();

        paragraph.append(elementNode1, elementNode2);
      });

      await update(() => {
        const elementNode1 = $getNodeByKey(elementNode1Key) as TextNode;
        const elementNode2 = $getNodeByKey(elementNode2Key) as ElementNode;
        elementNode2.append(elementNode1);
      });

      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><div dir="ltr"><span data-lexical-text="true">B</span><div dir="ltr"><span data-lexical-text="true">A</span></div></div></p></div>',
      );
    });

    it('moves node to different tree branches (node appended twice in two different branches)', async () => {
      function $createElementNodeWithText(text: string) {
        const elementNode = $createTestElementNode();
        const textNode = $createTextNode(text);
        elementNode.append(textNode);

        return elementNode;
      }

      let elementNode1Key: string;
      let elementNode2Key: string;
      let elementNode3Key: string;

      await update(() => {
        const paragraph = $getRoot().getFirstChild() as ParagraphNode;

        const elementNode1 = $createElementNodeWithText('A');
        elementNode1Key = elementNode1.getKey();

        const elementNode2 = $createElementNodeWithText('B');
        elementNode2Key = elementNode2.getKey();

        const elementNode3 = $createElementNodeWithText('C');
        elementNode3Key = elementNode3.getKey();

        paragraph.append(elementNode1, elementNode2, elementNode3);
      });

      await update(() => {
        const elementNode1 = $getNodeByKey(elementNode1Key) as ElementNode;
        const elementNode2 = $getNodeByKey(elementNode2Key) as ElementNode;
        const elementNode3 = $getNodeByKey(elementNode3Key) as TextNode;
        elementNode2.append(elementNode3);
        elementNode1.append(elementNode3);
      });

      expect(container.innerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><div dir="ltr"><span data-lexical-text="true">A</span><div dir="ltr"><span data-lexical-text="true">C</span></div></div><div dir="ltr"><span data-lexical-text="true">B</span></div></p></div>',
      );
    });
  });

  it('can subscribe and unsubscribe from commands and the callback is fired', () => {
    init();

    const commandListener = jest.fn();
    const command = createCommand('TEST_COMMAND');
    const payload = 'testPayload';
    const removeCommandListener = editor.registerCommand(
      command,
      commandListener,
      COMMAND_PRIORITY_EDITOR,
    );
    editor.dispatchCommand(command, payload);
    editor.dispatchCommand(command, payload);
    editor.dispatchCommand(command, payload);

    expect(commandListener).toHaveBeenCalledTimes(3);
    expect(commandListener).toHaveBeenCalledWith(payload, editor);

    removeCommandListener();

    editor.dispatchCommand(command, payload);
    editor.dispatchCommand(command, payload);
    editor.dispatchCommand(command, payload);

    expect(commandListener).toHaveBeenCalledTimes(3);
    expect(commandListener).toHaveBeenCalledWith(payload, editor);
  });

  it('removes the command from the command map when no listener are attached', () => {
    init();

    const commandListener = jest.fn();
    const commandListenerTwo = jest.fn();
    const command = createCommand('TEST_COMMAND');
    const removeCommandListener = editor.registerCommand(
      command,
      commandListener,
      COMMAND_PRIORITY_EDITOR,
    );
    const removeCommandListenerTwo = editor.registerCommand(
      command,
      commandListenerTwo,
      COMMAND_PRIORITY_EDITOR,
    );

    expect(editor._commands).toEqual(
      new Map([
        [
          command,
          [
            new Set([commandListener, commandListenerTwo]),
            new Set(),
            new Set(),
            new Set(),
            new Set(),
          ],
        ],
      ]),
    );

    removeCommandListener();

    expect(editor._commands).toEqual(
      new Map([
        [
          command,
          [
            new Set([commandListenerTwo]),
            new Set(),
            new Set(),
            new Set(),
            new Set(),
          ],
        ],
      ]),
    );

    removeCommandListenerTwo();

    expect(editor._commands).toEqual(new Map());
  });

  it('can register transforms before updates', async () => {
    init();

    const emptyTransform = () => {
      return;
    };

    const removeTextTransform = editor.registerNodeTransform(
      TextNode,
      emptyTransform,
    );
    const removeParagraphTransform = editor.registerNodeTransform(
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
    editor.registerTextContentListener((text) => {
      fn(text);
    });

    await editor.update(() => {
      const root = $getRoot();
      const child = root.getLastDescendant()!;
      child.insertAfter($createTextNode('bar'));
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('foobar');

    await editor.update(() => {
      const root = $getRoot();
      const child = root.getLastDescendant()!;
      child.insertAfter($createLineBreakNode());
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith('foobar\n');

    await editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      const paragraph2 = $createParagraphNode();
      root.append(paragraph);
      paragraph.append($createTextNode('bar'));
      paragraph2.append($createTextNode('yar'));
      paragraph.insertAfter(paragraph2);
    });

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenCalledWith('bar\n\nyar');

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const paragraph2 = $createParagraphNode();
      root.getLastChild()!.insertAfter(paragraph);
      paragraph.append($createTextNode('bar2'));
      paragraph2.append($createTextNode('yar2'));
      paragraph.insertAfter(paragraph2);
    });

    expect(fn).toHaveBeenCalledTimes(4);
    expect(fn).toHaveBeenCalledWith('bar\n\nyar\n\nbar2\n\nyar2');
  });

  it('mutation listener', async () => {
    init();

    const paragraphNodeMutations = jest.fn();
    const textNodeMutations = jest.fn();
    editor.registerMutationListener(ParagraphNode, paragraphNodeMutations);
    editor.registerMutationListener(TextNode, textNodeMutations);
    const paragraphKeys: string[] = [];
    const textNodeKeys: string[] = [];

    // No await intentional (batch with next)
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('foo');
      root.append(paragraph);
      paragraph.append(textNode);
      paragraphKeys.push(paragraph.getKey());
      textNodeKeys.push(textNode.getKey());
    });

    await editor.update(() => {
      const textNode = $getNodeByKey(textNodeKeys[0]) as TextNode;
      const textNode2 = $createTextNode('bar').toggleFormat('bold');
      const textNode3 = $createTextNode('xyz').toggleFormat('italic');
      textNode.insertAfter(textNode2);
      textNode2.insertAfter(textNode3);
      textNodeKeys.push(textNode2.getKey());
      textNodeKeys.push(textNode3.getKey());
    });

    await editor.update(() => {
      $getRoot().clear();
    });

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();

      paragraphKeys.push(paragraph.getKey());

      // Created and deleted in the same update (not attached to node)
      textNodeKeys.push($createTextNode('zzz').getKey());
      root.append(paragraph);
    });

    expect(paragraphNodeMutations.mock.calls.length).toBe(3);
    expect(textNodeMutations.mock.calls.length).toBe(2);

    const [paragraphMutation1, paragraphMutation2, paragraphMutation3] =
      paragraphNodeMutations.mock.calls;
    const [textNodeMutation1, textNodeMutation2] = textNodeMutations.mock.calls;

    expect(paragraphMutation1[0].size).toBe(1);
    expect(paragraphMutation1[0].get(paragraphKeys[0])).toBe('created');
    expect(paragraphMutation1[0].size).toBe(1);
    expect(paragraphMutation2[0].get(paragraphKeys[0])).toBe('destroyed');
    expect(paragraphMutation3[0].size).toBe(1);
    expect(paragraphMutation3[0].get(paragraphKeys[1])).toBe('created');
    expect(textNodeMutation1[0].size).toBe(3);
    expect(textNodeMutation1[0].get(textNodeKeys[0])).toBe('created');
    expect(textNodeMutation1[0].get(textNodeKeys[1])).toBe('created');
    expect(textNodeMutation1[0].get(textNodeKeys[2])).toBe('created');
    expect(textNodeMutation2[0].size).toBe(3);
    expect(textNodeMutation2[0].get(textNodeKeys[0])).toBe('destroyed');
    expect(textNodeMutation2[0].get(textNodeKeys[1])).toBe('destroyed');
    expect(textNodeMutation2[0].get(textNodeKeys[2])).toBe('destroyed');
  });

  it('mutation listener with setEditorState', async () => {
    init();

    await editor.update(() => {
      $getRoot().append($createParagraphNode());
    });

    const initialEditorState = editor.getEditorState();
    const textNodeMutations = jest.fn();
    editor.registerMutationListener(TextNode, textNodeMutations);
    const textNodeKeys: string[] = [];

    await editor.update(() => {
      const paragraph = $getRoot().getFirstChild() as ParagraphNode;
      const textNode1 = $createTextNode('foo');
      paragraph.append(textNode1);
      textNodeKeys.push(textNode1.getKey());
    });

    const fooEditorState = editor.getEditorState();

    await editor.setEditorState(initialEditorState);
    // This line should have no effect on the mutation listeners
    const parsedFooEditorState = editor.parseEditorState(
      JSON.stringify(fooEditorState),
    );

    await editor.update(() => {
      const paragraph = $getRoot().getFirstChild() as ParagraphNode;
      const textNode2 = $createTextNode('bar').toggleFormat('bold');
      const textNode3 = $createTextNode('xyz').toggleFormat('italic');
      paragraph.append(textNode2, textNode3);
      textNodeKeys.push(textNode2.getKey(), textNode3.getKey());
    });

    await editor.setEditorState(parsedFooEditorState);

    expect(textNodeMutations.mock.calls.length).toBe(4);

    const [
      textNodeMutation1,
      textNodeMutation2,
      textNodeMutation3,
      textNodeMutation4,
    ] = textNodeMutations.mock.calls;

    expect(textNodeMutation1[0].size).toBe(1);
    expect(textNodeMutation1[0].get(textNodeKeys[0])).toBe('created');
    expect(textNodeMutation2[0].size).toBe(1);
    expect(textNodeMutation2[0].get(textNodeKeys[0])).toBe('destroyed');
    expect(textNodeMutation3[0].size).toBe(2);
    expect(textNodeMutation3[0].get(textNodeKeys[1])).toBe('created');
    expect(textNodeMutation3[0].get(textNodeKeys[2])).toBe('created');
    expect(textNodeMutation4[0].size).toBe(3); // +1 newly generated key by parseEditorState
    expect(textNodeMutation4[0].get(textNodeKeys[1])).toBe('destroyed');
    expect(textNodeMutation4[0].get(textNodeKeys[2])).toBe('destroyed');
  });

  it('mutation listener set for original node should work with the replaced node', async () => {
    const ref = createRef<HTMLDivElement>();

    function TestBase() {
      editor = useLexicalEditor(ref, undefined, [
        TestTextNode,
        {
          replace: TextNode,
          with: (node: TextNode) => new TestTextNode(node.getTextContent()),
          withKlass: TestTextNode,
        },
      ]);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase />);
    });

    const textNodeMutations = jest.fn();
    editor.registerMutationListener(TextNode, textNodeMutations);
    const textNodeKeys: string[] = [];

    // No await intentional (batch with next)
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('foo');
      root.append(paragraph);
      paragraph.append(textNode);
      textNodeKeys.push(textNode.getKey());
    });

    await editor.update(() => {
      const textNode = $getNodeByKey(textNodeKeys[0]) as TextNode;
      const textNode2 = $createTextNode('bar').toggleFormat('bold');
      const textNode3 = $createTextNode('xyz').toggleFormat('italic');
      textNode.insertAfter(textNode2);
      textNode2.insertAfter(textNode3);
      textNodeKeys.push(textNode2.getKey());
      textNodeKeys.push(textNode3.getKey());
    });

    await editor.update(() => {
      $getRoot().clear();
    });

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();

      // Created and deleted in the same update (not attached to node)
      textNodeKeys.push($createTextNode('zzz').getKey());
      root.append(paragraph);
    });

    expect(textNodeMutations.mock.calls.length).toBe(2);

    const [textNodeMutation1, textNodeMutation2] = textNodeMutations.mock.calls;

    expect(textNodeMutation1[0].size).toBe(3);
    expect(textNodeMutation1[0].get(textNodeKeys[0])).toBe('created');
    expect(textNodeMutation1[0].get(textNodeKeys[1])).toBe('created');
    expect(textNodeMutation1[0].get(textNodeKeys[2])).toBe('created');
    expect(textNodeMutation2[0].size).toBe(3);
    expect(textNodeMutation2[0].get(textNodeKeys[0])).toBe('destroyed');
    expect(textNodeMutation2[0].get(textNodeKeys[1])).toBe('destroyed');
    expect(textNodeMutation2[0].get(textNodeKeys[2])).toBe('destroyed');
  });

  it('mutation listener should work with the replaced node', async () => {
    const ref = createRef<HTMLDivElement>();

    function TestBase() {
      editor = useLexicalEditor(ref, undefined, [
        TestTextNode,
        {
          replace: TextNode,
          with: (node: TextNode) => new TestTextNode(node.getTextContent()),
          withKlass: TestTextNode,
        },
      ]);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase />);
    });

    const textNodeMutations = jest.fn();
    editor.registerMutationListener(TestTextNode, textNodeMutations);
    const textNodeKeys: string[] = [];

    // No await intentional (batch with next)
    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode = $createTextNode('foo');
      root.append(paragraph);
      paragraph.append(textNode);
      textNodeKeys.push(textNode.getKey());
    });

    expect(textNodeMutations.mock.calls.length).toBe(1);

    const [textNodeMutation1] = textNodeMutations.mock.calls;

    expect(textNodeMutation1[0].size).toBe(1);
    expect(textNodeMutation1[0].get(textNodeKeys[0])).toBe('created');
  });

  it('mutation listeners does not trigger when other node types are mutated', async () => {
    init();

    const paragraphNodeMutations = jest.fn();
    const textNodeMutations = jest.fn();
    editor.registerMutationListener(ParagraphNode, paragraphNodeMutations);
    editor.registerMutationListener(TextNode, textNodeMutations);

    await editor.update(() => {
      $getRoot().append($createParagraphNode());
    });

    expect(paragraphNodeMutations.mock.calls.length).toBe(1);
    expect(textNodeMutations.mock.calls.length).toBe(0);
  });

  it('mutation listeners with normalization', async () => {
    init();

    const textNodeMutations = jest.fn();
    editor.registerMutationListener(TextNode, textNodeMutations);
    const textNodeKeys: string[] = [];

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode1 = $createTextNode('foo');
      const textNode2 = $createTextNode('bar');

      textNodeKeys.push(textNode1.getKey(), textNode2.getKey());
      root.append(paragraph);
      paragraph.append(textNode1, textNode2);
    });

    await editor.update(() => {
      const paragraph = $getRoot().getFirstChild() as ParagraphNode;
      const textNode3 = $createTextNode('xyz').toggleFormat('bold');
      paragraph.append(textNode3);
      textNodeKeys.push(textNode3.getKey());
    });

    await editor.update(() => {
      const textNode3 = $getNodeByKey(textNodeKeys[2]) as TextNode;
      textNode3.toggleFormat('bold'); // Normalize with foobar
    });

    expect(textNodeMutations.mock.calls.length).toBe(3);

    const [textNodeMutation1, textNodeMutation2, textNodeMutation3] =
      textNodeMutations.mock.calls;

    expect(textNodeMutation1[0].size).toBe(1);
    expect(textNodeMutation1[0].get(textNodeKeys[0])).toBe('created');
    expect(textNodeMutation2[0].size).toBe(2);
    expect(textNodeMutation2[0].get(textNodeKeys[2])).toBe('created');
    expect(textNodeMutation3[0].size).toBe(2);
    expect(textNodeMutation3[0].get(textNodeKeys[0])).toBe('updated');
    expect(textNodeMutation3[0].get(textNodeKeys[2])).toBe('destroyed');
  });

  it('mutation "update" listener', async () => {
    init();

    const paragraphNodeMutations = jest.fn();
    const textNodeMutations = jest.fn();

    editor.registerMutationListener(ParagraphNode, paragraphNodeMutations);
    editor.registerMutationListener(TextNode, textNodeMutations);

    const paragraphNodeKeys: string[] = [];
    const textNodeKeys: string[] = [];

    await editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      const textNode1 = $createTextNode('foo');
      textNodeKeys.push(textNode1.getKey());
      paragraphNodeKeys.push(paragraph.getKey());
      root.append(paragraph);
      paragraph.append(textNode1);
    });

    expect(paragraphNodeMutations.mock.calls.length).toBe(1);

    const [paragraphNodeMutation1] = paragraphNodeMutations.mock.calls;
    expect(textNodeMutations.mock.calls.length).toBe(1);

    const [textNodeMutation1] = textNodeMutations.mock.calls;

    expect(textNodeMutation1[0].size).toBe(1);
    expect(paragraphNodeMutation1[0].size).toBe(1);

    // Change first text node's content.
    await editor.update(() => {
      const textNode1 = $getNodeByKey(textNodeKeys[0]) as TextNode;
      textNode1.setTextContent('Test'); // Normalize with foobar
    });

    // Append text node to paragraph.
    await editor.update(() => {
      const paragraphNode1 = $getNodeByKey(
        paragraphNodeKeys[0],
      ) as ParagraphNode;
      const textNode1 = $createTextNode('foo');
      paragraphNode1.append(textNode1);
    });

    expect(textNodeMutations.mock.calls.length).toBe(3);

    const textNodeMutation2 = textNodeMutations.mock.calls[1];

    // Show TextNode was updated when text content changed.
    expect(textNodeMutation2[0].get(textNodeKeys[0])).toBe('updated');
    expect(paragraphNodeMutations.mock.calls.length).toBe(2);

    const paragraphNodeMutation2 = paragraphNodeMutations.mock.calls[1];

    // Show ParagraphNode was updated when new text node was appended.
    expect(paragraphNodeMutation2[0].get(paragraphNodeKeys[0])).toBe('updated');

    let tableCellKey: string;
    let tableRowKey: string;

    const tableCellMutations = jest.fn();
    const tableRowMutations = jest.fn();

    editor.registerMutationListener(TableCellNode, tableCellMutations);
    editor.registerMutationListener(TableRowNode, tableRowMutations);
    // Create Table

    await editor.update(() => {
      const root = $getRoot();
      const tableCell = $createTableCellNode(0);
      const tableRow = $createTableRowNode();
      const table = $createTableNode();

      tableRow.append(tableCell);
      table.append(tableRow);
      root.append(table);

      tableRowKey = tableRow.getKey();
      tableCellKey = tableCell.getKey();
    });
    // Add New Table Cell To Row

    await editor.update(() => {
      const tableRow = $getNodeByKey(tableRowKey) as TableRowNode;
      const tableCell = $createTableCellNode(0);
      tableRow.append(tableCell);
    });

    // Update Table Cell
    await editor.update(() => {
      const tableCell = $getNodeByKey(tableCellKey) as TableCellNode;
      tableCell.toggleHeaderStyle(1);
    });

    expect(tableCellMutations.mock.calls.length).toBe(3);
    const tableCellMutation3 = tableCellMutations.mock.calls[2];

    // Show table cell is updated when header value changes.
    expect(tableCellMutation3[0].get(tableCellKey!)).toBe('updated');
    expect(tableRowMutations.mock.calls.length).toBe(2);

    const tableRowMutation2 = tableRowMutations.mock.calls[1];

    // Show row is updated when a new child is added.
    expect(tableRowMutation2[0].get(tableRowKey!)).toBe('updated');
  });

  it('editable listener', () => {
    init();

    const editableFn = jest.fn();
    editor.registerEditableListener(editableFn);

    expect(editor.isEditable()).toBe(true);

    editor.setEditable(false);

    expect(editor.isEditable()).toBe(false);

    editor.setEditable(true);

    expect(editableFn.mock.calls).toEqual([[false], [true]]);
  });

  it('does not add new listeners while triggering existing', async () => {
    const updateListener = jest.fn();
    const mutationListener = jest.fn();
    const nodeTransformListener = jest.fn();
    const textContentListener = jest.fn();
    const editableListener = jest.fn();
    const commandListener = jest.fn();
    const TEST_COMMAND = createCommand('TEST_COMMAND');

    init();

    editor.registerUpdateListener(() => {
      updateListener();

      editor.registerUpdateListener(() => {
        updateListener();
      });
    });

    editor.registerMutationListener(TextNode, (map) => {
      mutationListener();
      editor.registerMutationListener(TextNode, () => {
        mutationListener();
      });
    });

    editor.registerNodeTransform(ParagraphNode, () => {
      nodeTransformListener();
      editor.registerNodeTransform(ParagraphNode, () => {
        nodeTransformListener();
      });
    });

    editor.registerEditableListener(() => {
      editableListener();
      editor.registerEditableListener(() => {
        editableListener();
      });
    });

    editor.registerTextContentListener(() => {
      textContentListener();
      editor.registerTextContentListener(() => {
        textContentListener();
      });
    });

    editor.registerCommand(
      TEST_COMMAND,
      (): boolean => {
        commandListener();
        editor.registerCommand(
          TEST_COMMAND,
          commandListener,
          COMMAND_PRIORITY_LOW,
        );
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    await update(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('Hello world')),
      );
    });

    editor.dispatchCommand(TEST_COMMAND, false);

    editor.setEditable(false);

    expect(updateListener).toHaveBeenCalledTimes(1);
    expect(editableListener).toHaveBeenCalledTimes(1);
    expect(commandListener).toHaveBeenCalledTimes(1);
    expect(textContentListener).toHaveBeenCalledTimes(1);
    expect(nodeTransformListener).toHaveBeenCalledTimes(1);
    expect(mutationListener).toHaveBeenCalledTimes(1);
  });

  it('can use flushSync for synchronous updates', () => {
    init();
    const onUpdate = jest.fn();
    editor.registerUpdateListener(onUpdate);
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Sync update')),
        );
      },
      {
        discrete: true,
      },
    );

    const textContent = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent());
    expect(textContent).toBe('Sync update');
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not include linebreak into inline elements', async () => {
    init();

    await editor.update(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('Hello'),
          $createTestInlineElementNode(),
        ),
      );
    });

    expect(container.firstElementChild?.innerHTML).toBe(
      '<p dir="ltr"><span data-lexical-text="true">Hello</span><a></a></p>',
    );
  });

  it('reconciles state without root element', () => {
    editor = createTestEditor({});
    const state = editor.parseEditorState(
      `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Hello world","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
    );
    editor.setEditorState(state);
    expect(editor._editorState).toBe(state);
    expect(editor._pendingEditorState).toBe(null);
  });

  describe('node replacement', () => {
    it('should work correctly', async () => {
      const onError = jest.fn();

      const newEditor = createTestEditor({
        nodes: [
          TestTextNode,
          {
            replace: TextNode,
            with: (node: TextNode) => new TestTextNode(node.getTextContent()),
          },
        ],
        onError: onError,
        theme: {
          text: {
            bold: 'editor-text-bold',
            italic: 'editor-text-italic',
            underline: 'editor-text-underline',
          },
        },
      });

      newEditor.setRootElement(container);

      await newEditor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('123');
        root.append(paragraph);
        paragraph.append(text);
        expect(text instanceof TestTextNode).toBe(true);
        expect(text.getTextContent()).toBe('123');
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('should fail if node keys are re-used', async () => {
      const onError = jest.fn();

      const newEditor = createTestEditor({
        nodes: [
          TestTextNode,
          {
            replace: TextNode,
            with: (node: TextNode) =>
              new TestTextNode(node.getTextContent(), node.getKey()),
          },
        ],
        onError: onError,
        theme: {
          text: {
            bold: 'editor-text-bold',
            italic: 'editor-text-italic',
            underline: 'editor-text-underline',
          },
        },
      });

      newEditor.setRootElement(container);

      await newEditor.update(() => {
        // this will throw
        $createTextNode('123');
        expect(false).toBe('unreachable');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/TestTextNode.*re-use key.*TextNode/),
        }),
      );
    });

    it('node transform to the nodes specified by "replace" should not be applied to the nodes specified by "with" when "withKlass" is not specified', async () => {
      const onError = jest.fn();

      const newEditor = createTestEditor({
        nodes: [
          TestTextNode,
          {
            replace: TextNode,
            with: (node: TextNode) => new TestTextNode(node.getTextContent()),
          },
        ],
        onError: onError,
        theme: {
          text: {
            bold: 'editor-text-bold',
            italic: 'editor-text-italic',
            underline: 'editor-text-underline',
          },
        },
      });

      newEditor.setRootElement(container);

      const mockTransform = jest.fn();
      const removeTransform = newEditor.registerNodeTransform(
        TextNode,
        mockTransform,
      );

      await newEditor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('123');
        root.append(paragraph);
        paragraph.append(text);
        expect(text instanceof TestTextNode).toBe(true);
        expect(text.getTextContent()).toBe('123');
      });

      await newEditor.getEditorState().read(() => {
        expect(mockTransform).toHaveBeenCalledTimes(0);
      });

      expect(onError).not.toHaveBeenCalled();
      removeTransform();
    });

    it('node transform to the nodes specified by "replace" should be applied also to the nodes specified by "with" when "withKlass" is specified', async () => {
      const onError = jest.fn();

      const newEditor = createTestEditor({
        nodes: [
          TestTextNode,
          {
            replace: TextNode,
            with: (node: TextNode) => new TestTextNode(node.getTextContent()),
            withKlass: TestTextNode,
          },
        ],
        onError: onError,
        theme: {
          text: {
            bold: 'editor-text-bold',
            italic: 'editor-text-italic',
            underline: 'editor-text-underline',
          },
        },
      });

      newEditor.setRootElement(container);

      const mockTransform = jest.fn();
      const removeTransform = newEditor.registerNodeTransform(
        TextNode,
        mockTransform,
      );

      await newEditor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('123');
        root.append(paragraph);
        paragraph.append(text);
        expect(text instanceof TestTextNode).toBe(true);
        expect(text.getTextContent()).toBe('123');
      });

      await newEditor.getEditorState().read(() => {
        expect(mockTransform).toHaveBeenCalledTimes(1);
      });

      expect(onError).not.toHaveBeenCalled();
      removeTransform();
    });
  });

  it('recovers from reconciler failure and trigger proper prev editor state', async () => {
    const updateListener = jest.fn();
    const textListener = jest.fn();
    const onError = jest.fn();
    const updateError = new Error('Failed updateDOM');

    init(onError);

    editor.registerUpdateListener(updateListener);
    editor.registerTextContentListener(textListener);

    await update(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('Hello')),
      );
    });

    // Cause reconciler error in update dom, so that it attempts to fallback by
    // reseting editor and rerendering whole content
    jest.spyOn(ParagraphNode.prototype, 'updateDOM').mockImplementation(() => {
      throw updateError;
    });

    const editorState = editor.getEditorState();

    editor.registerUpdateListener(updateListener);

    await update(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('world')),
      );
    });

    expect(onError).toBeCalledWith(updateError);
    expect(textListener).toBeCalledWith('Hello\n\nworld');
    expect(updateListener.mock.lastCall[0].prevEditorState).toBe(editorState);
  });

  it('should call importDOM methods only once', async () => {
    jest.spyOn(ParagraphNode, 'importDOM');

    class CustomParagraphNode extends ParagraphNode {
      static getType() {
        return 'custom-paragraph';
      }

      static clone(node: CustomParagraphNode) {
        return new CustomParagraphNode(node.__key);
      }

      static importJSON() {
        return new CustomParagraphNode();
      }

      exportJSON() {
        return {...super.exportJSON(), type: 'custom-paragraph'};
      }
    }

    createTestEditor({nodes: [CustomParagraphNode]});

    expect(ParagraphNode.importDOM).toHaveBeenCalledTimes(1);
  });

  it('root element count is always positive', () => {
    const newEditor1 = createTestEditor();
    const newEditor2 = createTestEditor();

    const container1 = document.createElement('div');
    const container2 = document.createElement('div');

    newEditor1.setRootElement(container1);
    newEditor1.setRootElement(null);

    newEditor1.setRootElement(container1);
    newEditor2.setRootElement(container2);
    newEditor1.setRootElement(null);
    newEditor2.setRootElement(null);
  });
});
