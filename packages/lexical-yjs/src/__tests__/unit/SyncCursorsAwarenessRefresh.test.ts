/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  createBinding,
  type Provider,
  syncCursorPositions,
  type UserState,
} from '@lexical/yjs';
import {defineExtension} from 'lexical';
import {afterEach, assert, describe, expect, test} from 'vitest';
import {Doc} from 'yjs';

const REMOTE_CLIENT_ID = 4242;

function userState(name: string, color: string): UserState {
  return {
    anchorPos: null,
    awarenessData: {},
    color,
    focusPos: null,
    focusing: false,
    name,
  };
}

describe('syncCursorPositions awareness refresh', () => {
  const editors: LexicalEditorWithDispose[] = [];
  afterEach(() => {
    for (const editor of editors) {
      editor.dispose();
    }
    editors.length = 0;
  });

  function buildBinding() {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[cursor-awareness]',
      }),
    );
    editors.push(editor);
    const doc = new Doc();
    const docMap = new Map<string, Doc>([['cursor-awareness', doc]]);
    const binding = createBinding(
      editor,
      null as unknown as Provider,
      'cursor-awareness',
      doc,
      docMap,
    );
    return {binding, editor};
  }

  function sync(
    binding: ReturnType<typeof createBinding>,
    state: UserState,
  ): void {
    syncCursorPositions(binding, null as unknown as Provider, {
      getAwarenessStates: () =>
        new Map<number, UserState>([[REMOTE_CLIENT_ID, state]]),
    });
  }

  test('a peer that renames itself updates its cursor name', () => {
    const {binding} = buildBinding();

    sync(binding, userState('Bob', '#ff0000'));
    const cursor = binding.cursors.get(REMOTE_CLIENT_ID);
    assert(cursor !== undefined);
    expect(cursor.name).toBe('Bob');

    sync(binding, userState('Robert', '#ff0000'));
    expect(binding.cursors.get(REMOTE_CLIENT_ID)?.name).toBe('Robert');
  });

  test('a peer that changes colour updates its cursor colour', () => {
    const {binding} = buildBinding();

    sync(binding, userState('Bob', '#ff0000'));
    expect(binding.cursors.get(REMOTE_CLIENT_ID)?.color).toBe('#ff0000');

    sync(binding, userState('Bob', '#0000ff'));
    expect(binding.cursors.get(REMOTE_CLIENT_ID)?.color).toBe('#0000ff');
  });

  test('an unchanged peer keeps the same cursor object', () => {
    const {binding} = buildBinding();

    sync(binding, userState('Bob', '#ff0000'));
    const first = binding.cursors.get(REMOTE_CLIENT_ID);
    sync(binding, userState('Bob', '#ff0000'));
    expect(binding.cursors.get(REMOTE_CLIENT_ID)).toBe(first);
  });
});
