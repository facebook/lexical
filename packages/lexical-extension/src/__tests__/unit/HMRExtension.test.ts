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
import {describe, expect, test} from 'vitest';

function createMockHotContext(): HotContext {
  return {data: {}};
}

function $setupContent(text: string) {
  $getRoot()
    .clear()
    .append($createParagraphNode().append($createTextNode(text)));
}

function createEditor(hot: HotContext | null) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => $setupContent('initial'),
      dependencies: [HistoryExtension, configExtension(HMRExtension, {hot})],
      name: 'hmr-test',
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
    hot.data.lexicalHMR = {
      editable: true,
      editorState: 'corrupt',
      historyState: null,
    };

    using editor = createEditor(hot);
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('initial');
    });
  });

  test('uses initial state when saved editorState is empty', () => {
    const hot = createMockHotContext();

    const bareEditor = buildEditorFromExtensions(
      defineExtension({name: 'empty-state-source'}),
    );
    const emptyState = bareEditor.getEditorState();
    bareEditor.dispose();

    // Must match HMR_KEY in HMRExtension.ts
    hot.data.lexicalHMR = {
      editable: false,
      editorState: emptyState,
      historyState: null,
    };

    using editor = createEditor(hot);
    expect(editor.isEditable()).toBe(false);
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('initial');
    });
  });

  test('works without HistoryExtension', () => {
    const hot = createMockHotContext();

    function createEditorNoHistory(hotCtx: HotContext) {
      return buildEditorFromExtensions(
        defineExtension({
          $initialEditorState: () => $setupContent('initial'),
          dependencies: [configExtension(HMRExtension, {hot: hotCtx})],
          name: 'hmr-no-history-test',
        }),
      );
    }

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
});
