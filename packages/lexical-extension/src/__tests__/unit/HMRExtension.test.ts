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
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
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

function createEditor(hot: HotContext | null, id?: string) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => $setupContent('initial'),
      dependencies: [
        HistoryExtension,
        configExtension(HMRExtension, {hot, id}),
      ],
      name: 'hmr-test',
    }),
  );
}

function createEditorNoHistory(hot: HotContext) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => $setupContent('initial'),
      dependencies: [configExtension(HMRExtension, {hot})],
      name: 'hmr-no-history-test',
    }),
  );
}

function createEditorNoInitialState(hot: HotContext) {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [configExtension(HMRExtension, {hot})],
      name: 'hmr-no-initial-state-test',
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
    // Must match HMR_KEY in HMRExtension.ts
    // editorStateJSON passes shape check but contains an unknown node type
    // that causes parseEditorState to throw
    hot.data.lexicalHMR = {
      editable: true,
      editorStateJSON: {
        root: {
          children: [{type: '__hmr_corrupt_node__', version: 1}],
          direction: 'ltr',
          format: 0,
          indent: 0,
          type: 'root',
          version: 1,
        },
      },
      historyStateJSON: null,
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
    // Old extension format (editorState: live EditorState, historyState: ...)
    // editable: false proves the entire payload is rejected — not just the wrong fields
    // Must match HMR_KEY in HMRExtension.ts
    hot.data.lexicalHMR = {
      editable: false,
      editorState: {_nodeMap: new Map()},
      historyState: null,
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

    const bareEditor = buildEditorFromExtensions(
      defineExtension({name: 'empty-state-source'}),
    );
    const emptyStateJSON = bareEditor.getEditorState().toJSON();
    bareEditor.dispose();

    // Must match HMR_KEY in HMRExtension.ts
    hot.data.lexicalHMR = {
      editable: false,
      editorStateJSON: emptyStateJSON,
      historyStateJSON: null,
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

    // Underlying hot.data keys must be distinct
    expect(hot.data['lexicalHMR:a']).toBeDefined();
    expect(hot.data['lexicalHMR:b']).toBeDefined();
    expect(hot.data['lexicalHMR:a']).not.toBe(hot.data['lexicalHMR:b']);
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

  test('preserves content but clears history when saved history is corrupted', () => {
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

    // Corrupt only the history — leave editorStateJSON intact
    const saved = hot.data.lexicalHMR as {historyStateJSON: unknown};
    saved.historyStateJSON = {
      current: 'not-a-state',
      redoStack: [],
      undoStack: [],
    };

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      using editor = createEditor(hot);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('valid');
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not restore undo/redo history'),
        expect.anything(),
      );
      // History was cleared — undo must be a no-op (would have reached 'first' if intact)
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('valid');
      });
    } finally {
      warn.mockRestore();
    }
  });

  test('warns in dev when multiple editors share HotContext without id', () => {
    const hot = createMockHotContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      using _editor1 = createEditor(hot);
      using _editor2 = createEditor(hot);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Multiple editors share the same HMR context'),
      );
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
    // Must match HMR_KEY in HMRExtension.ts
    hot.data.lexicalHMR = {
      editable: false,
      editorStateJSON: {
        root: {
          children: [{type: '__hmr_corrupt_node__', version: 1}],
          direction: 'ltr',
          format: 0,
          indent: 0,
          type: 'root',
          version: 1,
        },
      },
      historyStateJSON: null,
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

    // Corrupt only undoStack shape — isValidSerializedHistoryState returns false,
    // history block is skipped silently (no warning, no createEmptyHistoryState call)
    const saved = hot.data.lexicalHMR as {historyStateJSON: unknown};
    saved.historyStateJSON = {
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
    // Saved state now has a non-null historyStateJSON from HistoryExtension

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

  test('does not overwrite valid saved state with empty editor state on first-mount effect run (validPrev path)', () => {
    const hot = createMockHotContext();

    // Build an empty editorStateJSON that passes isValidHMRSavedState but isEmpty() === true.
    // This causes the restore block to skip setEditorState, so the effect fires while
    // the editor is still empty — exercising the validPrev branch.
    const bareEditor = buildEditorFromExtensions(
      defineExtension({name: 'empty-source-for-validprev'}),
    );
    const emptyStateJSON = bareEditor.getEditorState().toJSON();
    bareEditor.dispose();

    // historyStateJSON with a non-null value serves as the sentinel:
    // if validPrev fires, hot.data retains this value;
    // if the effect overwrites without validPrev, historyPeer is absent so it becomes null.
    hot.data.lexicalHMR = {
      editable: true,
      editorStateJSON: emptyStateJSON,
      historyStateJSON: {redoStack: [], undoStack: []},
    };

    using _editor = createEditorNoInitialState(hot);

    const saved = hot.data.lexicalHMR as {historyStateJSON: unknown};
    expect(saved.historyStateJSON).toEqual({redoStack: [], undoStack: []});
  });
});
