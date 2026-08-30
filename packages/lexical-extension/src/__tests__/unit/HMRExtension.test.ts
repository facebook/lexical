/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  configExtension,
  HMRExtension,
  type HotContext,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  defineExtension,
  type EditorState,
  HISTORY_PUSH_TAG,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {describe, expect, test, vi} from 'vitest';

function createMockHotContext(): HotContext {
  return {data: {}};
}

function $setupContent(text: string) {
  $getRoot()
    .clear()
    .append($createParagraphNode().append($createTextNode(text)));
}

function $setupParagraphs(...texts: string[]) {
  $getRoot()
    .clear()
    .append(
      ...texts.map(text =>
        $createParagraphNode().append($createTextNode(text)),
      ),
    );
}

/** Reads the caret/selection as `[anchorPath, anchorOffset, focusPath, focusOffset]`. */
function $readRangeSelection() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }
  const describePoint = (point: {
    getNode: () => {getTextContent: () => string};
    offset: number;
  }) => [point.getNode().getTextContent(), point.offset] as const;
  return [describePoint(selection.anchor), describePoint(selection.focus)];
}

/**
 * Builds an EditorState detached from any live editor, standing in for the
 * state that a previous module instance would have stashed in `hot.data`.
 */
function createDetachedEditorState(): EditorState {
  const editor = buildEditorFromExtensions(
    defineExtension({name: 'detached-editor-state-source'}),
  );
  try {
    return editor.getEditorState();
  } finally {
    editor.dispose();
  }
}

// Stable namespace shared by all test helpers so HMR keys are consistent
// across createEditor / createEditorNoHistory / createEditorNoInitialState.
const TEST_NAMESPACE = 'hmr-test';
// Must match `lexicalHMR:${TEST_NAMESPACE}` produced by getHMRKey in HMRExtension.ts
const TEST_HMR_KEY = `lexicalHMR:${TEST_NAMESPACE}`;

function createEditor(hot: HotContext | null, id?: string) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => $setupContent('initial'),
      dependencies: [
        HistoryExtension,
        configExtension(HMRExtension, {hot, id}),
      ],
      name: 'hmr-test',
      namespace: TEST_NAMESPACE,
    }),
  );
}

function createEditorNoHistory(hot: HotContext) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => $setupContent('initial'),
      dependencies: [configExtension(HMRExtension, {hot})],
      name: 'hmr-no-history-test',
      namespace: TEST_NAMESPACE,
    }),
  );
}

function createEditorWithNamespace(hot: HotContext, namespace: string) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => $setupContent('initial'),
      dependencies: [configExtension(HMRExtension, {hot})],
      name: `editor-${namespace}`,
      namespace,
    }),
  );
}

/** An editor is only "in use" once it has a root element. */
function $mount(editor: {setRootElement: (el: HTMLElement) => void}) {
  editor.setRootElement(document.createElement('div'));
}

function createEditorNoInitialState(hot: HotContext) {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [configExtension(HMRExtension, {hot})],
      name: 'hmr-no-initial-state-test',
      namespace: TEST_NAMESPACE,
    }),
  );
}

describe('HMRExtension', () => {
  test('preserves editor content through HMR cycle', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(() => $setupContent('hello HMR'), {discrete: true});
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('hello HMR');
      });
    }

    {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('hello HMR');
      });
    }
  });

  test('preserves editable flag through HMR cycle', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.setEditable(false);
    }

    {
      using editor = createEditor(hot);
      expect(editor.isEditable()).toBe(false);
    }
  });

  test('preserves undo and redo history through HMR cycle', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(() => $setupContent('first'), {discrete: true});
      editor.update(() => $setupContent('second'), {
        discrete: true,
        tag: HISTORY_PUSH_TAG,
      });
    }

    {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('second');
      });
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('first');
      });
      editor.dispatchCommand(REDO_COMMAND, undefined);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('second');
      });
    }
  });

  test('preserves state through multiple HMR cycles', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(() => $setupContent('cycle-1'), {discrete: true});
    }

    {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('cycle-1');
      });
      editor.update(() => $setupContent('cycle-2'), {discrete: true});
    }

    {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('cycle-2');
      });
    }
  });

  test('does nothing when hot is null', () => {
    using editor = createEditor(null);
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('initial');
    });
  });

  test('starts fresh when saved state is corrupted', () => {
    const hot = createMockHotContext();
    // editorState passes the shape check but serializes to an unknown node
    // type, so parseEditorState throws when it is restored
    hot.data[TEST_HMR_KEY] = {
      editable: true,
      editorState: {
        isEmpty: () => false,
        toJSON: () => ({
          root: {
            children: [{type: '__hmr_corrupt_node__', version: 1}],
            direction: 'ltr',
            format: 0,
            indent: 0,
            type: 'root',
            version: 1,
          },
        }),
      },
      historyState: null,
    };

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('initial');
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not restore previous editor state'),
        expect.anything(),
      );
    } finally {
      warn.mockRestore();
    }
  });

  test('starts fresh when saved state has invalid shape', () => {
    const hot = createMockHotContext();
    // Old extension format (editorStateJSON / historyStateJSON), plus a value
    // under `editorState` that is not an EditorState at all.
    // editable: false proves the entire payload is rejected — not just the wrong fields
    hot.data[TEST_HMR_KEY] = {
      editable: false,
      editorState: {_nodeMap: new Map()},
      editorStateJSON: {root: {children: []}},
      historyStateJSON: null,
    };

    using editor = createEditor(hot);
    // isEditable() must be true (default) since the invalid-shape payload was rejected
    expect(editor.isEditable()).toBe(true);
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('initial');
    });
  });

  test('uses initial state when saved editorState is empty', () => {
    const hot = createMockHotContext();

    hot.data[TEST_HMR_KEY] = {
      editable: false,
      editorState: createDetachedEditorState(),
      historyState: null,
    };

    using editor = createEditor(hot);
    expect(editor.isEditable()).toBe(false);
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('initial');
    });
  });

  test('preserves independent state for multiple editors sharing one HotContext', () => {
    const hot = createMockHotContext();

    {
      using editor1 = createEditor(hot, 'a');
      using editor2 = createEditor(hot, 'b');
      // Write b first so that a broken shared-key impl would leave 'content-b' for both
      editor2.update(() => $setupContent('content-b'), {discrete: true});
      editor1.update(() => $setupContent('content-a'), {discrete: true});
    }

    {
      using editor1 = createEditor(hot, 'a');
      using editor2 = createEditor(hot, 'b');
      editor1.read(() => {
        const text = $getRoot().getTextContent();
        expect(text).toBe('content-a');
        expect(text).not.toBe('content-b');
      });
      editor2.read(() => {
        const text = $getRoot().getTextContent();
        expect(text).toBe('content-b');
        expect(text).not.toBe('content-a');
      });
    }

    // Underlying hot.data keys must be distinct and include namespace
    expect(hot.data[`lexicalHMR:${TEST_NAMESPACE}:a`]).toBeDefined();
    expect(hot.data[`lexicalHMR:${TEST_NAMESPACE}:b`]).toBeDefined();
    expect(hot.data[`lexicalHMR:${TEST_NAMESPACE}:a`]).not.toBe(
      hot.data[`lexicalHMR:${TEST_NAMESPACE}:b`],
    );
  });

  test('preserves independent undo/redo history for multiple editors sharing one HotContext', () => {
    const hot = createMockHotContext();

    {
      using editor1 = createEditor(hot, 'a');
      using editor2 = createEditor(hot, 'b');
      editor1.update(() => $setupContent('a1'), {discrete: true});
      editor1.update(() => $setupContent('a2'), {
        discrete: true,
        tag: HISTORY_PUSH_TAG,
      });
      editor2.update(() => $setupContent('b1'), {discrete: true});
      editor2.update(() => $setupContent('b2'), {
        discrete: true,
        tag: HISTORY_PUSH_TAG,
      });
    }

    {
      using editor1 = createEditor(hot, 'a');
      using editor2 = createEditor(hot, 'b');
      editor1.dispatchCommand(UNDO_COMMAND, undefined);
      editor2.dispatchCommand(UNDO_COMMAND, undefined);
      editor1.read(() => {
        expect($getRoot().getTextContent()).toBe('a1');
      });
      editor2.read(() => {
        expect($getRoot().getTextContent()).toBe('b1');
      });
    }
  });

  test('drops only the corrupted history entry when saved history is partly corrupted', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      // Two discrete updates so undo stack has a real entry to clear
      editor.update(() => $setupContent('first'), {discrete: true});
      editor.update(() => $setupContent('valid'), {
        discrete: true,
        tag: HISTORY_PUSH_TAG,
      });
    }

    // Corrupt only the `current` entry, keeping the real undo stack, so the
    // restore has both a broken entry and a good one to deal with
    const saved = hot.data[TEST_HMR_KEY] as {
      historyState: {current: unknown; undoStack: unknown[]};
    };
    expect(saved.historyState.undoStack).toHaveLength(1);
    saved.historyState = {...saved.historyState, current: 'not-a-state'};

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('valid');
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Dropped 1 undo/redo entry'),
      );
      // Only the corrupted `current` entry was dropped: the undo stack itself
      // survived, so undo still reaches the earlier state
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('first');
      });
    } finally {
      warn.mockRestore();
    }
  });

  test('warns when two mounted editors share an HMR key', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      using editor1 = createEditorWithNamespace(hot, 'shared-key-ns');
      using editor2 = createEditorWithNamespace(hot, 'shared-key-ns');
      $mount(editor1);
      $mount(editor2);
      editor1.update(() => $setupContent('one'), {discrete: true});
      editor2.update(() => $setupContent('two'), {discrete: true});
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Two mounted editors are sharing the HMR key "lexicalHMR:shared-key-ns"',
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });

  test('does not warn when a replacement editor overlaps the one it replaces', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // The shape LexicalExtensionComposer produces on an HMR cycle: the
      // replacement is built (during render) while the old editor is still
      // mounted, and the old one is disposed afterwards (effect cleanup).
      const previous = createEditorWithNamespace(hot, 'swap-ns');
      $mount(previous);
      previous.update(() => $setupContent('typed'), {discrete: true});

      using next = createEditorWithNamespace(hot, 'swap-ns');
      previous.dispose();
      $mount(next);
      next.update(() => $setupContent('typed again'), {discrete: true});

      next.read(() => {
        expect($getRoot().getTextContent()).toBe('typed again');
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('does not warn for an editor that was built but never mounted', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // React StrictMode renders twice, so the first editor of a pair is
      // discarded without ever being mounted (or disposed).
      using _discarded = createEditorWithNamespace(hot, 'discarded-ns');
      using kept = createEditorWithNamespace(hot, 'discarded-ns');
      $mount(kept);
      kept.update(() => $setupContent('kept'), {discrete: true});
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('does not warn for a single editor without id', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      using _editor = createEditor(hot);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('does not warn when multiple editors provide distinct ids', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      using _e1 = createEditor(hot, 'a');
      using _e2 = createEditor(hot, 'b');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('isolates two editors by namespace without requiring id', () => {
    const hot = createMockHotContext();

    {
      using main = createEditorWithNamespace(hot, 'main-ns');
      using sidebar = createEditorWithNamespace(hot, 'sidebar-ns');
      main.update(() => $setupContent('main-content'), {discrete: true});
      sidebar.update(() => $setupContent('sidebar-content'), {discrete: true});
    }

    {
      using main = createEditorWithNamespace(hot, 'main-ns');
      using sidebar = createEditorWithNamespace(hot, 'sidebar-ns');
      main.read(() => {
        expect($getRoot().getTextContent()).toBe('main-content');
      });
      sidebar.read(() => {
        expect($getRoot().getTextContent()).toBe('sidebar-content');
      });
    }

    // Distinct namespace-based keys, no id needed
    expect(hot.data['lexicalHMR:main-ns']).toBeDefined();
    expect(hot.data['lexicalHMR:sidebar-ns']).toBeDefined();
  });

  test('does not warn when multiple editors have distinct namespaces and no id', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      using _e1 = buildEditorFromExtensions(
        defineExtension({
          dependencies: [configExtension(HMRExtension, {hot})],
          name: 'ns-a-editor',
          namespace: 'ns-a',
        }),
      );
      using _e2 = buildEditorFromExtensions(
        defineExtension({
          dependencies: [configExtension(HMRExtension, {hot})],
          name: 'ns-b-editor',
          namespace: 'ns-b',
        }),
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('warns in dev when id is an empty string', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      using editor = createEditor(hot, '');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('`id` must not be an empty string'),
      );
      // Editor still initializes despite the warning
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('initial');
      });
    } finally {
      warn.mockRestore();
    }
  });

  test('does not warn on sequential HMR cycles without id', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      {
        using _e = createEditor(hot);
      }
      {
        using _e = createEditor(hot);
      }
      {
        using _e = createEditor(hot);
      }
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('preserves editable flag even when saved state fails to parse', () => {
    const hot = createMockHotContext();
    // editable: false proves setEditable fires before parseEditorState throws
    hot.data[TEST_HMR_KEY] = {
      editable: false,
      editorState: {
        isEmpty: () => false,
        toJSON: () => ({
          root: {
            children: [{type: '__hmr_corrupt_node__', version: 1}],
            direction: 'ltr',
            format: 0,
            indent: 0,
            type: 'root',
            version: 1,
          },
        }),
      },
      historyState: null,
    };

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditor(hot);
      // setEditable runs before parseEditorState throws, so editable is preserved
      expect(editor.isEditable()).toBe(false);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('initial');
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not restore previous editor state'),
        expect.anything(),
      );
    } finally {
      warn.mockRestore();
    }
  });

  test('silently skips history when saved historyState has invalid shape', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(() => $setupContent('valid'), {
        discrete: true,
        tag: HISTORY_PUSH_TAG,
      });
    }

    // Corrupt only undoStack shape — isValidHistoryState returns false,
    // history block is skipped silently (no warning, no createEmptyHistoryState call)
    const saved = hot.data[TEST_HMR_KEY] as {historyState: unknown};
    saved.historyState = {
      current: null,
      redoStack: [],
      undoStack: 'not-an-array',
    };

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('valid');
      });
      // Invalid shape is treated as no saved history — no warning expected
      expect(warn).not.toHaveBeenCalled();
      // Undo is a no-op since history was not restored
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('valid');
      });
    } finally {
      warn.mockRestore();
    }
  });

  test('warns when saved history exists but HistoryExtension is no longer present', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot); // includes HistoryExtension
      editor.update(() => $setupContent('with-history'), {discrete: true});
    }
    // Saved state now has a non-null historyState from HistoryExtension

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditorNoHistory(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('with-history');
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Saved undo/redo history discarded'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  test('works without HistoryExtension', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditorNoHistory(hot);
      editor.update(() => $setupContent('no history'), {discrete: true});
    }

    {
      using editor = createEditorNoHistory(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('no history');
      });
    }
  });

  test('preserves state for an editor with no configured namespace', () => {
    const hot = createMockHotContext();
    const createUnnamespaced = () =>
      buildEditorFromExtensions(
        defineExtension({
          $initialEditorState: () => $setupContent('initial'),
          dependencies: [configExtension(HMRExtension, {hot})],
          name: 'no-namespace-editor',
        }),
      );

    {
      using editor = createUnnamespaced();
      editor.update(() => $setupContent('no namespace'), {discrete: true});
    }

    {
      using editor = createUnnamespaced();
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('no namespace');
      });
    }

    // createEditor generates a fresh random namespace for each of these
    // editors, so the key must not be built from it: one stable key, rather
    // than an orphaned entry pinning an EditorState for every cycle
    expect(Object.keys(hot.data)).toEqual(['lexicalHMR:']);
  });

  test('preserves the caret of an undo history entry', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(
        () => {
          $setupParagraphs('alpha');
          $getRoot().getLastDescendant()!.selectEnd();
        },
        {discrete: true},
      );
      editor.update(() => $setupParagraphs('bravo'), {
        discrete: true,
        tag: HISTORY_PUSH_TAG,
      });
    }

    {
      using editor = createEditor(hot);
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('alpha');
        expect($readRangeSelection()).toEqual([
          ['alpha', 5],
          ['alpha', 5],
        ]);
      });
    }
  });

  test('preserves a collapsed caret through an HMR cycle', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(
        () => {
          $setupParagraphs('first paragraph', 'second paragraph');
          $getRoot().getLastDescendant()!.selectStart();
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.anchor.offset = 6;
            selection.focus.offset = 6;
          }
        },
        {discrete: true},
      );
    }

    {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($readRangeSelection()).toEqual([
          ['second paragraph', 6],
          ['second paragraph', 6],
        ]);
      });
    }
  });

  test('preserves a selection spanning two paragraphs through an HMR cycle', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(
        () => {
          $setupParagraphs('alpha', 'beta');
          const root = $getRoot();
          root
            .getFirstDescendant()!
            .selectStart()
            .focus.set(root.getLastDescendant()!.getKey(), 4, 'text');
        },
        {discrete: true},
      );
    }

    {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($readRangeSelection()).toEqual([
          ['alpha', 0],
          ['beta', 4],
        ]);
      });
    }
  });

  test('preserves a node selection through an HMR cycle', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(
        () => {
          $setupParagraphs('one', 'two');
          const selection = $createNodeSelection();
          selection.add($getRoot().getChildAtIndex(1)!.getKey());
          $setSelection(selection);
        },
        {discrete: true},
      );
    }

    {
      using editor = createEditor(hot);
      editor.read(() => {
        const selection = $getSelection();
        expect($isNodeSelection(selection)).toBe(true);
        expect(
          selection!.getNodes().map(node => node.getTextContent()),
        ).toEqual(['two']);
      });
    }
  });

  test('restores the content when the saved selection no longer resolves', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(() => $setupParagraphs('kept'), {discrete: true});
    }

    // A path into a child that the restored document does not have
    const saved = hot.data[TEST_HMR_KEY] as {captureSelection: () => unknown};
    saved.captureSelection = () => ({
      anchor: {offset: 0, path: [7, 0], type: 'text'},
      focus: {offset: 0, path: [7, 0], type: 'text'},
      format: 0,
      style: '',
      type: 'range',
    });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('kept');
        expect($getSelection()).toBe(null);
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('restores the content when capturing the selection throws', () => {
    const hot = createMockHotContext();

    {
      using editor = createEditor(hot);
      editor.update(() => $setupParagraphs('kept'), {discrete: true});
    }

    const saved = hot.data[TEST_HMR_KEY] as {captureSelection: () => unknown};
    saved.captureSelection = () => {
      throw new Error('no active editor state');
    };

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('kept');
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not restore the previous selection'),
        expect.anything(),
      );
    } finally {
      warn.mockRestore();
    }
  });

  test('does not capture the selection until the state is restored', () => {
    const hot = createMockHotContext();

    using editor = createEditor(hot);
    editor.update(() => $setupParagraphs('typed'), {discrete: true});

    const saved = hot.data[TEST_HMR_KEY] as {captureSelection: () => unknown};
    // Still a closure over the live state — nothing has been walked or copied
    expect(typeof saved.captureSelection).toBe('function');
  });

  test('stores a reference to the live editor state instead of a serialized copy', () => {
    const hot = createMockHotContext();

    using editor = createEditor(hot);
    editor.update(() => $setupContent('live'), {discrete: true});

    const saved = hot.data[TEST_HMR_KEY] as {editorState: EditorState};
    expect(saved.editorState).toBe(editor.getEditorState());
  });

  test('serialization work does not grow with the number of editor updates', () => {
    // EditorState.prototype, so every instance created below is counted
    const editorStatePrototype = Object.getPrototypeOf(
      createDetachedEditorState(),
    );

    // Returns how many times an editor state was serialized over a full HMR
    // cycle (edits, reload, restore). HistoryExtension is left out so that the
    // undo stack — the only other thing that is serialized — stays empty and
    // the update count is the sole variable.
    const countSerializationsForCycle = (updates: number): number => {
      const hot = createMockHotContext();
      const toJSON = vi.spyOn(editorStatePrototype, 'toJSON');
      try {
        {
          using editor = createEditorNoHistory(hot);
          for (let i = 0; i < updates; i++) {
            editor.update(() => $setupContent(`update-${i}`), {
              discrete: true,
            });
          }
          expect(toJSON).not.toHaveBeenCalled();
        }
        {
          using editor = createEditorNoHistory(hot);
          editor.read(() => {
            expect($getRoot().getTextContent()).toBe(`update-${updates - 1}`);
          });
        }
        return toJSON.mock.calls.length;
      } finally {
        toJSON.mockRestore();
      }
    };

    // One serialization per HMR cycle, no matter how much editing happened
    expect(countSerializationsForCycle(2)).toBe(1);
    expect(countSerializationsForCycle(50)).toBe(1);
  });

  test('does not overwrite valid saved state with empty editor state on first-mount effect run (validPrev path)', () => {
    const hot = createMockHotContext();

    // Build an empty editorState that passes isValidHMRSavedState but isEmpty() === true.
    // This causes the restore block to skip setEditorState, so the effect fires while
    // the editor is still empty — exercising the validPrev branch.
    // historyState with a non-null value serves as the sentinel:
    // if validPrev fires, hot.data retains this value;
    // if the effect overwrites without validPrev, historyPeer is absent so it becomes null.
    hot.data[TEST_HMR_KEY] = {
      editable: true,
      editorState: createDetachedEditorState(),
      historyState: {redoStack: [], undoStack: []},
    };

    using _editor = createEditorNoInitialState(hot);

    const saved = hot.data[TEST_HMR_KEY] as {historyState: unknown};
    expect(saved.historyState).toEqual({redoStack: [], undoStack: []});
  });
});
