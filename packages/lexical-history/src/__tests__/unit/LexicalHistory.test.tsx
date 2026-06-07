/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
  NestedEditorExtension,
} from '@lexical/extension';
import {
  createEmptyHistoryState,
  HistoryExtension,
  type HistoryState,
  registerHistory,
  SharedHistoryExtension,
} from '@lexical/history';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {$createQuoteNode, RichTextExtension} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {$restoreEditorState} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $create,
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getState,
  $isNodeSelection,
  $isRangeSelection,
  $selectAll,
  $setSelection,
  $setState,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  configExtension,
  createState,
  CUT_COMMAND,
  DecoratorNode,
  defineExtension,
  EditorConfig,
  ElementNode,
  HISTORY_MERGE_TAG,
  type KlassConstructor,
  LexicalEditor,
  LexicalEditorWithDispose,
  LexicalNode,
  type NodeKey,
  PASTE_COMMAND,
  REDO_COMMAND,
  SerializedElementNode,
  type SerializedTextNode,
  type Spread,
  TextNode,
  UNDO_COMMAND,
} from 'lexical';
import {
  createTestEditor,
  expectHtmlToBeEqual,
  html,
  TestComposer,
} from 'lexical/src/__tests__/utils';
import {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

function $createParagraphNodeWithText(text: string) {
  return $createParagraphNode().append($createTextNode(text));
}

type SerializedCustomTextNode = Spread<
  {type: string; classes: string[]},
  SerializedTextNode
>;

class CustomTextNode extends TextNode {
  /** @internal */
  declare ['constructor']: KlassConstructor<typeof CustomTextNode>;

  __classes: Set<string>;
  constructor(text: string, classes: Iterable<string>, key?: NodeKey) {
    super(text, key);
    this.__classes = new Set(classes);
  }
  static getType(): 'custom-text' {
    return 'custom-text';
  }
  static clone(node: CustomTextNode): CustomTextNode {
    return new CustomTextNode(node.__text, node.__classes, node.__key);
  }
  addClass(className: string): this {
    const self = this.getWritable();
    self.__classes.add(className);
    return self;
  }
  removeClass(className: string): this {
    const self = this.getWritable();
    self.__classes.delete(className);
    return self;
  }
  setClasses(classes: Iterable<string>): this {
    const self = this.getWritable();
    self.__classes = new Set(classes);
    return self;
  }
  getClasses(): ReadonlySet<string> {
    return this.getLatest().__classes;
  }
  static importJSON({text, classes}: SerializedCustomTextNode): CustomTextNode {
    return $createCustomTextNode(text, classes);
  }
  exportJSON(): SerializedCustomTextNode {
    return {
      ...super.exportJSON(),
      classes: Array.from(this.getClasses()),
    };
  }
}
function $createCustomTextNode(
  text: string,
  classes: string[] = [],
): CustomTextNode {
  return $applyNodeReplacement(new CustomTextNode(text, classes));
}
function $isCustomTextNode(
  node: LexicalNode | null | undefined,
): node is CustomTextNode {
  return node instanceof CustomTextNode;
}

const EditorKey = createState('editor', {
  parse: (): null | LexicalEditorWithDispose => null,
});

class ChildEditorNode extends DecoratorNode<null> {
  $config() {
    return this.config('child-editor', {extends: DecoratorNode});
  }
  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    return document.createElement('div');
  }
  isInline(): boolean {
    return false;
  }
  updateDOM(prevNode: this) {
    return false;
  }
  getOrResetEditor(): LexicalEditorWithDispose {
    const prevEditor = $getState(this, EditorKey);
    if (prevEditor) {
      return prevEditor;
    }
    const editor = buildEditorFromExtensions({
      dependencies: [SharedHistoryExtension, NestedEditorExtension],
      name: 'ChildEditorNode',
    });
    $setState(this, EditorKey, editor);
    return editor;
  }
}

const ChildEditorExtension = defineExtension({
  name: '@lexical/test/ChildEditor',
  nodes: [ChildEditorNode],
  register: editor =>
    editor.registerMutationListener(
      ChildEditorNode,
      (nodes, {prevEditorState}) => {
        const curEditorState = editor.getEditorState();
        for (const key of nodes.keys()) {
          const dom = editor.getElementByKey(key);
          const prevNode = $getNodeByKey(key, prevEditorState);
          const curNode = $getNodeByKey(key, curEditorState);
          const prevEditor =
            prevNode && $getState(prevNode, EditorKey, 'direct');
          const curEditor = curNode && $getState(curNode, EditorKey, 'direct');
          if (prevEditor && prevEditor !== curEditor) {
            prevEditor.setRootElement(null);
          }
          if (curEditor) {
            curEditor.setRootElement(dom);
          }
        }
      },
    ),
});

describe('LexicalHistory tests', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container !== null) {
      document.body.removeChild(container);
    }
    container = null;

    vi.restoreAllMocks();
  });

  // Shared instance across tests
  let editor: LexicalEditor;

  function TestPlugin() {
    // Plugin used just to get our hands on the Editor object
    [editor] = useLexicalComposerContext();
    return null;
  }
  function Test(): JSX.Element {
    return (
      <TestComposer>
        <RichTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={
            <div className="editor-placeholder">Enter some text...</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <TestPlugin />
        <HistoryPlugin />
      </TestComposer>
    );
  }

  test('LexicalHistory after clearing', async () => {
    let canRedo = true;
    let canUndo = true;

    await act(() => {
      reactRoot.render(<Test key="smth" />);
    });

    editor.registerCommand<boolean>(
      CAN_REDO_COMMAND,
      payload => {
        canRedo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    editor.registerCommand<boolean>(
      CAN_UNDO_COMMAND,
      payload => {
        canUndo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    await act(async () => {
      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    });

    expect(canRedo).toBe(false);
    expect(canUndo).toBe(false);
  });

  test('LexicalHistory.Redo after Quote Node', async () => {
    await act(() => {
      reactRoot.render(<Test key="smth" />);
    });

    await act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph1 = $createParagraphNodeWithText('AAA');
        const paragraph2 = $createParagraphNodeWithText('BBB');

        // The editor has one child that is an empty
        // paragraph Node.
        root.getChildAtIndex(0)?.replace(paragraph1);
        root.append(paragraph2);
      });
    });

    const initialJSONState = editor.getEditorState().toJSON();

    await act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const selection = $createRangeSelection();

        const firstTextNode = root.getAllTextNodes()[0];
        selection.anchor.set(firstTextNode.getKey(), 0, 'text');
        selection.focus.set(firstTextNode.getKey(), 3, 'text');

        $setSelection(selection);
        $setBlocksType(selection, () => $createQuoteNode());
      });
    });

    const afterQuoteInsertionJSONState = editor.getEditorState().toJSON();
    expect(afterQuoteInsertionJSONState.root.children.length).toBe(2);
    expect(afterQuoteInsertionJSONState.root.children[0].type).toBe('quote');

    expect(
      (afterQuoteInsertionJSONState.root.children as SerializedElementNode[])[0]
        .children.length,
    ).toBe(1);
    expect(
      (afterQuoteInsertionJSONState.root.children as SerializedElementNode[])[0]
        .children[0].type,
    ).toBe('text');
    expect(
      (
        (
          afterQuoteInsertionJSONState.root.children as SerializedElementNode[]
        )[0].children[0] as SerializedTextNode
      ).text,
    ).toBe('AAA');

    await act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      });
    });

    expect(JSON.stringify(initialJSONState)).toBe(
      JSON.stringify(editor.getEditorState().toJSON()),
    );
  });

  test('LexicalHistory in sequence: change, undo, redo, undo, change', async () => {
    let canRedo = false;
    let canUndo = false;

    await act(() => {
      reactRoot.render(<Test key="smth" />);
    });

    editor.registerCommand<boolean>(
      CAN_REDO_COMMAND,
      payload => {
        canRedo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    editor.registerCommand<boolean>(
      CAN_UNDO_COMMAND,
      payload => {
        canUndo = payload;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    // focus (needs the focus to initialize)
    await act(async () => {
      editor.focus();
    });

    expect(canRedo).toBe(false);
    expect(canUndo).toBe(false);

    // change
    await act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNodeWithText('foo');
        root.append(paragraph);
      });
    });
    expect(canRedo).toBe(false);
    expect(canUndo).toBe(true);

    // undo
    await act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      });
    });
    expect(canRedo).toBe(true);
    expect(canUndo).toBe(false);

    // redo
    await act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(REDO_COMMAND, undefined);
      });
    });
    expect(canRedo).toBe(false);
    expect(canUndo).toBe(true);

    // undo
    await act(async () => {
      await editor.update(() => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      });
    });
    expect(canRedo).toBe(true);
    expect(canUndo).toBe(false);

    // change
    await act(async () => {
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNodeWithText('foo');
        root.append(paragraph);
      });
    });

    expect(canRedo).toBe(false);
    expect(canUndo).toBe(true);
  });

  test('undoStack selection points to the same editor', async () => {
    const editor_ = createTestEditor({namespace: 'parent'});
    const sharedHistory = createEmptyHistoryState();
    registerHistory(editor_, sharedHistory, 1000);
    await editor_.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
    });
    await editor_.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      const nodeSelection = $createNodeSelection();
      nodeSelection.add(paragraph.getKey());
      $setSelection(nodeSelection);
    });
    const nestedEditor = createTestEditor({namespace: 'nested'});
    await nestedEditor.update(
      () => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.selectEnd();
      },
      {
        tag: HISTORY_MERGE_TAG,
      },
    );
    nestedEditor._parentEditor = editor_;
    registerHistory(nestedEditor, sharedHistory, 1000);

    await nestedEditor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      root.append(paragraph);
      paragraph.selectEnd();
    });

    expect(sharedHistory.undoStack.length).toBe(2);
    await editor_.dispatchCommand(UNDO_COMMAND, undefined);
    expect($isNodeSelection(editor_.getEditorState()._selection)).toBe(true);
  });

  test('Changes to TextNode leaf are detected properly #6409', async () => {
    editor = createTestEditor({
      nodes: [CustomTextNode],
    });
    const sharedHistory = createEmptyHistoryState();
    registerHistory(editor, sharedHistory, 0);
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createCustomTextNode('Initial text'),
            ),
          );
      },
      {discrete: true},
    );
    expect(sharedHistory.undoStack).toHaveLength(0);

    editor.update(
      () => {
        // Mark dirty with no changes
        for (const node of $getRoot().getAllTextNodes()) {
          node.getWritable();
        }
        // Restore the editor state and ensure the history did not change
        $restoreEditorState(editor, editor.getEditorState());
      },
      {discrete: true},
    );
    expect(sharedHistory.undoStack).toHaveLength(0);
    editor.update(
      () => {
        // Mark dirty with text change
        for (const node of $getRoot().getAllTextNodes()) {
          if ($isCustomTextNode(node)) {
            node.setTextContent(node.getTextContent() + '!');
          }
        }
      },
      {discrete: true},
    );
    expect(sharedHistory.undoStack).toHaveLength(1);

    editor.update(
      () => {
        // Mark dirty with only a change to the class
        for (const node of $getRoot().getAllTextNodes()) {
          if ($isCustomTextNode(node)) {
            node.addClass('updated');
          }
        }
      },
      {discrete: true},
    );
    expect(sharedHistory.undoStack).toHaveLength(2);
  });
});

describe('HistoryExtension canUndo/canRedo signals', () => {
  function buildEditor() {
    return buildEditorFromExtensions({
      dependencies: [configExtension(HistoryExtension, {delay: 0})],
      name: 'test',
    });
  }

  function buildEditorWithHistory(historyState: HistoryState) {
    return buildEditorFromExtensions({
      dependencies: [
        configExtension(HistoryExtension, {
          createInitialHistoryState: () => historyState,
          delay: 0,
        }),
      ],
      name: 'test',
    });
  }

  function $appendParagraph(text: string) {
    $getRoot().append($createParagraphNode().append($createTextNode(text)));
  }

  // Two updates are required to populate the undoStack: the first update sets
  // `historyState.current`, the second pushes the previous `current` onto the
  // stack and dispatches CAN_UNDO_COMMAND.
  function makeEditorWithOneUndoEntry() {
    const editor = buildEditor();
    editor.update(() => $appendParagraph('first'), {discrete: true});
    editor.update(() => $appendParagraph('second'), {discrete: true});
    return editor;
  }

  test('signals start as false', () => {
    using editor = buildEditor();
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.canUndo.peek()).toBe(false);
    expect(output.canRedo.peek()).toBe(false);
  });

  test('canUndo becomes true after a push, canRedo stays false', () => {
    using editor = makeEditorWithOneUndoEntry();
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.canUndo.peek()).toBe(true);
    expect(output.canRedo.peek()).toBe(false);
  });

  test('canRedo becomes true after undo, canUndo goes false', () => {
    using editor = makeEditorWithOneUndoEntry();
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(output.canUndo.peek()).toBe(false);
    expect(output.canRedo.peek()).toBe(true);
  });

  test('canRedo clears after redo, canUndo returns true', () => {
    using editor = makeEditorWithOneUndoEntry();
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    editor.dispatchCommand(REDO_COMMAND, undefined);
    expect(output.canUndo.peek()).toBe(true);
    expect(output.canRedo.peek()).toBe(false);
  });

  test('signals reset to false after CLEAR_HISTORY_COMMAND', () => {
    using editor = makeEditorWithOneUndoEntry();
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.canUndo.peek()).toBe(true);
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    expect(output.canUndo.peek()).toBe(false);
    expect(output.canRedo.peek()).toBe(false);
  });

  test('canRedo clears when a new edit is made after undo', () => {
    using editor = makeEditorWithOneUndoEntry();
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    // Wrap UNDO dispatch in editor.update so that the HISTORIC_TAG from
    // undo's setEditorState does not leak into the subsequent edit.
    editor.update(() => editor.dispatchCommand(UNDO_COMMAND, undefined), {
      discrete: true,
    });
    expect(output.canRedo.peek()).toBe(true);
    editor.update(() => $appendParagraph('third'), {discrete: true});
    expect(output.canRedo.peek()).toBe(false);
    expect(output.canUndo.peek()).toBe(true);
  });

  test('canUndo is true immediately when initialized with a non-empty undoStack', () => {
    using donor = makeEditorWithOneUndoEntry();
    const donorHistory = getExtensionDependencyFromEditor(
      donor,
      HistoryExtension,
    ).output.historyState.peek();
    expect(donorHistory.undoStack.length).toBeGreaterThan(0);

    using editor = buildEditorWithHistory(donorHistory);
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.canUndo.peek()).toBe(true);
    expect(output.canRedo.peek()).toBe(false);
  });

  test('canRedo is true immediately when initialized with a non-empty redoStack', () => {
    using donor = makeEditorWithOneUndoEntry();
    donor.dispatchCommand(UNDO_COMMAND, undefined);
    const donorHistory = getExtensionDependencyFromEditor(
      donor,
      HistoryExtension,
    ).output.historyState.peek();
    expect(donorHistory.redoStack.length).toBeGreaterThan(0);

    using editor = buildEditorWithHistory(donorHistory);
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.canUndo.peek()).toBe(false);
    expect(output.canRedo.peek()).toBe(true);
  });

  test('signals update when historyState signal is reassigned to a populated state', () => {
    // Simulates what SharedHistoryExtension does when it inherits parent state.
    using editor = buildEditor();
    const dep = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(dep.output.canUndo.peek()).toBe(false);

    const populated = createEmptyHistoryState();
    populated.undoStack.push({
      editor,
      editorState: editor.getEditorState(),
    });

    dep.output.historyState.value = populated;
    expect(dep.output.canUndo.peek()).toBe(true);
    expect(dep.output.canRedo.peek()).toBe(false);
  });
});

describe('HistoryExtension maxDepth', () => {
  function buildEditorWithMaxDepth(maxDepth: number | null) {
    return buildEditorFromExtensions({
      dependencies: [configExtension(HistoryExtension, {delay: 0, maxDepth})],
      name: 'test',
    });
  }

  function $appendParagraph(text: string) {
    $getRoot().append($createParagraphNode().append($createTextNode(text)));
  }

  function pushNHistoryEvents(editor: LexicalEditor, n: number) {
    // Each editor.update with discrete: true is a separate history event when
    // delay is 0 — the merge window is closed.  The first update populates
    // historyState.current; the second pushes it onto undoStack; from then
    // on every additional update adds one entry.  So `n` updates produce
    // `n - 1` undoStack entries.
    for (let i = 0; i < n; i++) {
      editor.update(() => $appendParagraph(`p${i}`), {discrete: true});
    }
  }

  test('defaults to null (unbounded) and matches the historical behavior', () => {
    using editor = buildEditorWithMaxDepth(null);
    pushNHistoryEvents(editor, 25);
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.maxDepth.peek()).toBe(null);
    expect(output.historyState.peek().undoStack.length).toBe(24);
  });

  test('caps the undoStack to maxDepth via FIFO eviction', () => {
    using editor = buildEditorWithMaxDepth(5);
    pushNHistoryEvents(editor, 20);
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.historyState.peek().undoStack.length).toBe(5);
    // canUndo stays true once any entry exists.
    expect(output.canUndo.peek()).toBe(true);
  });

  test('reactively respects a maxDepth signal update for future events', () => {
    using editor = buildEditorWithMaxDepth(null);
    pushNHistoryEvents(editor, 8); // 7 entries
    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);
    expect(output.historyState.peek().undoStack.length).toBe(7);

    // Lowering maxDepth does not retroactively trim — only future pushes
    // observe the new cap, at which point the stack settles to that length.
    output.maxDepth.value = 3;
    expect(output.historyState.peek().undoStack.length).toBe(7);

    pushNHistoryEvents(editor, 5); // 5 more events trigger trimming
    expect(output.historyState.peek().undoStack.length).toBe(3);
  });
});

describe('SharedHistoryExtension', () => {
  test('can create a parent editor', async () => {
    const clock = Date.now();
    let step = -1;
    function artificialNow() {
      return clock + 1000 * ++step;
    }
    const editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(HistoryExtension, {delay: 0, now: artificialNow}),
        ChildEditorExtension,
      ],
      name: 'parent',
    });
    const dom = document.createElement('div');
    editor.setRootElement(dom);
    editor.update(
      () => $selectAll().insertNodes([$createTextNode('parent editor')]),
      {discrete: true},
    );
    const $getChildEditor = () => {
      const child = $getRoot().getChildAtIndex(1);
      assert(child instanceof ChildEditorNode, 'Expecting ChildEditorNode');
      return child.getOrResetEditor();
    };
    expectHtmlToBeEqual(
      dom.innerHTML,
      html`
        <p dir="auto"><span data-lexical-text="true">parent editor</span></p>
      `,
    );
    editor.update(
      () => {
        const child = $create(ChildEditorNode);
        child.getOrResetEditor().update(
          () => {
            $selectAll().insertText('Child editor');
            $setSelection(null);
          },
          {discrete: true},
        );
        $getRoot().selectEnd().insertNodes([child]);
      },
      {discrete: true},
    );
    expectHtmlToBeEqual(
      dom.innerHTML,
      html`
        <p dir="auto"><span data-lexical-text="true">parent editor</span></p>
        <div
          contenteditable="false"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-decorator="true"
          data-lexical-editor="true">
          <p dir="auto"><span data-lexical-text="true">Child editor</span></p>
        </div>
        <p dir="auto"><br /></p>
      `,
    );
    editor.read(() => {
      $getChildEditor().update(
        () => {
          $getRoot().selectEnd().insertText('. Updated!');
          $setSelection(null);
        },
        {discrete: true},
      );
    });
    expectHtmlToBeEqual(
      dom.innerHTML,
      html`
        <p dir="auto"><span data-lexical-text="true">parent editor</span></p>
        <div
          contenteditable="false"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-decorator="true"
          data-lexical-editor="true">
          <p dir="auto">
            <span data-lexical-text="true">Child editor. Updated!</span>
          </p>
        </div>
        <p dir="auto"><br /></p>
      `,
    );
    expect(
      getExtensionDependencyFromEditor(
        editor.read($getChildEditor),
        HistoryExtension,
      ).output.historyState.peek(),
    ).toBe(
      getExtensionDependencyFromEditor(
        editor,
        HistoryExtension,
      ).output.historyState.peek(),
    );

    editor.dispatchCommand(UNDO_COMMAND, undefined);
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    editor.read(() => {
      expect($getChildEditor().read(() => $getRoot().getTextContent())).toEqual(
        'Child editor',
      );
    });
    expectHtmlToBeEqual(
      dom.innerHTML,
      html`
        <p dir="auto"><span data-lexical-text="true">parent editor</span></p>
        <div
          contenteditable="false"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-decorator="true"
          data-lexical-editor="true">
          <p dir="auto"><span data-lexical-text="true">Child editor</span></p>
        </div>
        <p dir="auto"><br /></p>
      `,
    );
    editor.update(() => editor.dispatchCommand(UNDO_COMMAND, undefined), {
      discrete: true,
    });
    expectHtmlToBeEqual(
      dom.innerHTML,
      html`
        <p dir="auto"><span data-lexical-text="true">parent editor</span></p>
      `,
    );
  });
});

describe('History snapshot before cut or paste', () => {
  // These tests use a controlled now function so that every update appears
  // to happen at the same virtual millisecond. With delay 1000
  // and timeDiff 0 less than delay the delay based merge fires for consecutive
  // same type character level changes. That is exactly what real typing produces
  // where each keystroke is an insert update and they all collapse.
  //
  // The scenario: typing within the merge window would also merge
  // a single char paste without the push tag. Our fix adds the tag so
  // the paste or cut always pushes a clean snapshot first. We verify
  // this by dispatching real PASTE_COMMAND and CUT_COMMAND.
  const DELAY = 1000;

  // Seed the editor: create a paragraph with text and select end of text so
  // that subsequent insertText calls are character level inserts.
  function $initParagraph(text: string): void {
    const textNode = $createTextNode(text);
    $getRoot().clear().append($createParagraphNode().append(textNode));
    textNode.select(text.length, text.length);
  }

  function buildEditor(now: () => number) {
    return buildEditorFromExtensions({
      dependencies: [
        RichTextExtension,
        configExtension(HistoryExtension, {delay: DELAY, now}),
      ],
      name: 'test',
    });
  }

  function dispatchUndo(editor: LexicalEditor) {
    editor.update(() => editor.dispatchCommand(UNDO_COMMAND, undefined), {
      discrete: true,
    });
  }

  test('paste creates a distinct history entry even when within the merge window', async () => {
    // With virtual now always returning 0 the time difference is less than delay
    // so every consecutive insert character update would be merged. A paste
    // triggered by PASTE_COMMAND must break the merge chain and push a snapshot.
    const virtualNow = () => 0;
    using editor = buildEditor(virtualNow);

    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);

    // Seed with Hello and place cursor at end. This first update sets
    // historyState.current.
    editor.update(
      () => {
        $initParagraph('Hello');
      },
      {discrete: true},
    );

    // Type a space to produce INSERT_CHARACTER_AFTER_SELECTION.
    editor.update(
      () => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) {
          sel.insertText(' ');
        }
      },
      {discrete: true},
    );

    const stackBeforePaste = output.historyState.peek().undoStack.length;

    // Paste W with same change type and same virtual time.
    // Dispatch PASTE_COMMAND with a ClipboardEvent.
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'W');
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'clipboardData', {
      value: clipboardData,
    });
    editor.dispatchCommand(PASTE_COMMAND, event);

    // Wait for the subsequent editor update to complete.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(output.historyState.peek().undoStack.length).toBeGreaterThan(
      stackBeforePaste,
    );

    // One undo returns to the pre paste state Hello.
    dispatchUndo(editor);
    const textAfterUndo = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent());
    expect(textAfterUndo).toBe('Hello ');
  });

  test('cut creates a distinct history entry even when within the merge window', async () => {
    // A cut removes text. We select the exclamation mark and dispatch CUT_COMMAND.
    // Since CUT_COMMAND is async we await it and check that a snapshot is pushed.
    const virtualNow = () => 0;
    using editor = buildEditor(virtualNow);

    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);

    editor.update(
      () => {
        $initParagraph('Hello!');
      },
      {discrete: true},
    );

    // Select the exclamation mark from anchor 5 to focus 6.
    editor.update(
      () => {
        const textNode = $getRoot()
          .getFirstChildOrThrow<ElementNode>()
          .getFirstChildOrThrow<TextNode>();
        textNode.select(5, 6);
      },
      {discrete: true},
    );

    const stackBeforeCut = output.historyState.peek().undoStack.length;

    // Dispatch CUT_COMMAND.
    const event = new ClipboardEvent('cut');
    editor.dispatchCommand(CUT_COMMAND, event);

    // Wait for the async copyToClipboard and the subsequent update to complete.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(output.historyState.peek().undoStack.length).toBeGreaterThan(
      stackBeforeCut,
    );

    // Undo returns to the pre cut snapshot Hello!
    dispatchUndo(editor);
    const textAfterUndo = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent());
    expect(textAfterUndo).toBe('Hello!');
  });

  test('paste after typing does not merge with the preceding typing', async () => {
    // Typing e l l o after H all within the merge window collapses
    // into one history entry. Without the push tag on the paste pasting
    // W would also merge. With it one undo returns to Hello and not Hell or Hel.
    const virtualNow = () => 0;
    using editor = buildEditor(virtualNow);

    const {output} = getExtensionDependencyFromEditor(editor, HistoryExtension);

    // Seed with H.
    editor.update(
      () => {
        $initParagraph('H');
      },
      {discrete: true},
    );

    // Type e l l o so they all collapse into the current entry.
    for (const ch of ['e', 'l', 'l', 'o']) {
      editor.update(
        () => {
          const sel = $getSelection();
          if ($isRangeSelection(sel)) {
            sel.insertText(ch);
          }
        },
        {discrete: true},
      );
    }

    const stackAfterTyping = output.historyState.peek().undoStack.length;

    // Paste W with same change type and same virtual time.
    // Dispatch PASTE_COMMAND with a ClipboardEvent.
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'W');
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, 'clipboardData', {
      value: clipboardData,
    });
    editor.dispatchCommand(PASTE_COMMAND, event);

    // Wait for the subsequent editor update to complete.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(output.historyState.peek().undoStack.length).toBeGreaterThan(
      stackAfterTyping,
    );

    // One undo jumps to Hello which is the full merged typing result.
    dispatchUndo(editor);
    const textAfterUndo = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent());
    expect(textAfterUndo).toBe('Hello');
  });
});
