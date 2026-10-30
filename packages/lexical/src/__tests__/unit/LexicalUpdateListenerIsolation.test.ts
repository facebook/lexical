/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function setup(rethrows = true) {
  const errors: Error[] = [];
  const editor = createEditor({
    onError: error => {
      errors.push(error);
      if (rethrows) {
        throw error;
      }
    },
  });
  editor.update(
    () => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('before')),
      );
    },
    {discrete: true},
  );
  return {editor, errors};
}

function commit(editor: LexicalEditor, text: string) {
  editor.update(
    () => {
      ($getRoot().getFirstDescendant() as TextNode).setTextContent(text);
    },
    {discrete: true},
  );
}

describe('update listener error isolation', () => {
  test.each([true, false])(
    'later listeners see the commit and the next update, onError rethrows: %s',
    rethrows => {
      const {editor, errors} = setup(rethrows);
      const failure = new Error('listener bug');
      let armed = true;
      editor.registerUpdateListener(() => {
        if (armed) {
          armed = false;
          throw failure;
        }
      });
      const commits: [string, string][] = [];
      editor.registerUpdateListener(({editorState, prevEditorState}) => {
        commits.push([
          prevEditorState.read(() => $getRoot().getTextContent()),
          editorState.read(() => $getRoot().getTextContent()),
        ]);
      });

      expect(() => commit(editor, 'after')).toThrow(failure);
      expect(commits).toEqual([['before', 'after']]);
      expect(editor._updating).toBe(false);
      expect(editor._pendingEditorState).toBe(null);
      expect(errors).toEqual([]);

      commit(editor, 'next');
      expect(commits).toEqual([
        ['before', 'after'],
        ['after', 'next'],
      ]);
    },
  );

  test('keeps the first of multiple listener errors', () => {
    const {editor, errors} = setup();
    const first = new Error('first');
    const seen: string[] = [];
    editor.registerUpdateListener(() => {
      seen.push('first');
      throw first;
    });
    editor.registerUpdateListener(() => {
      seen.push('second');
      throw new Error('second');
    });
    editor.registerUpdateListener(() => {
      seen.push('last');
    });

    expect(() => commit(editor, 'after')).toThrow(first);
    expect(seen).toEqual(['first', 'second', 'last']);
    expect(errors).toEqual([]);
    expect(editor._updating).toBe(false);
  });

  test.each([undefined, null, 0])(
    'a non-Error throw (%s) is preserved and does not stop notification',
    failure => {
      const {editor, errors} = setup();
      let notified = false;
      editor.registerUpdateListener(() => {
        throw failure;
      });
      editor.registerUpdateListener(() => {
        notified = true;
        throw new Error('later error');
      });
      let thrown = false;
      try {
        commit(editor, 'after');
      } catch (error) {
        thrown = true;
        expect(error).toBe(failure);
      }
      expect(thrown).toBe(true);
      expect(notified).toBe(true);
      expect(errors).toEqual([]);
      expect(editor._updating).toBe(false);
    },
  );

  test('does not repeat a throwing cleanup', () => {
    const {editor} = setup();
    const failure = new Error('cleanup bug');
    let cleanupCalls = 0;
    let notified = 0;
    let armed = false;
    editor.registerUpdateListener(() => {
      return () => {
        cleanupCalls++;
        if (armed) {
          throw failure;
        }
      };
    });
    editor.registerUpdateListener(() => {
      notified++;
    });

    commit(editor, 'one');
    armed = true;
    expect(() => commit(editor, 'two')).toThrow(failure);
    expect(notified).toBe(2);
    armed = false;
    commit(editor, 'three');
    expect(cleanupCalls).toBe(1);
    expect(notified).toBe(3);
  });

  test('does not repeat cleanup after a listener throws', () => {
    const {editor} = setup();
    let cleanupCalls = 0;
    let armed = false;
    editor.registerUpdateListener(() => {
      if (armed) {
        armed = false;
        throw new Error('listener bug');
      }
      return () => {
        cleanupCalls++;
      };
    });

    commit(editor, 'one');
    armed = true;
    expect(() => commit(editor, 'two')).toThrow('listener bug');
    commit(editor, 'three');
    expect(cleanupCalls).toBe(1);
  });

  test('editable listeners still stop at the first error', () => {
    const {editor, errors} = setup();
    const failure = new Error('editable listener bug');
    let notified = false;
    editor.registerEditableListener(() => {
      throw failure;
    });
    editor.registerEditableListener(() => {
      notified = true;
    });

    expect(() => editor.setEditable(!editor.isEditable())).toThrow(failure);
    expect(notified).toBe(false);
    expect(errors).toEqual([]);
    expect(editor._updating).toBe(false);
  });

  test('cleans up a listener that unregisters itself', () => {
    const {editor} = setup();
    let cleanups = 0;
    let remove = () => {};
    remove = editor.registerUpdateListener(() => {
      remove();
      return () => {
        cleanups++;
      };
    });

    commit(editor, 'one');
    commit(editor, 'two');
    expect(cleanups).toBe(1);
  });
});
