/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {describe, expect, test, vi} from 'vitest';

describe('LexicalEditor listeners', () => {
  describe('registerRootListener', () => {
    test('can return a function that is called when unregistered', () => {
      const editor = buildEditorFromExtensions({name: '@test'});
      const rootListenerCallback = vi.fn();
      const rootListener = vi
        .fn()
        .mockImplementation((nextRoot, prevRoot) => rootListenerCallback);
      const unregister = editor.registerRootListener(rootListener);
      expect(editor._listeners.root.has(rootListener)).toBe(true);
      expect(rootListener).toHaveBeenCalledTimes(1);
      expect(rootListener).toHaveBeenLastCalledWith(null, null);
      expect(rootListenerCallback).toHaveBeenCalledTimes(0);
      unregister();
      expect(rootListener).toHaveBeenCalledTimes(2);
      expect(rootListener).toHaveBeenLastCalledWith(null, null);
      // Called once to unregister the original return value and then again after the finalization (null, …) call
      expect(rootListenerCallback).toHaveBeenCalledTimes(2);
      expect(editor._listeners.root.has(rootListener)).toBe(false);
    });
    test('updates the function on each call', () => {
      const editor = buildEditorFromExtensions({name: '@test'});
      const rootListenerCallback = vi.fn();
      const rootListener = vi
        .fn()
        .mockImplementationOnce((nextRoot, prevRoot) => rootListenerCallback);
      const unregister = editor.registerRootListener(rootListener);
      expect(rootListener).toHaveBeenCalledTimes(1);
      expect(rootListener).toHaveBeenLastCalledWith(null, null);
      expect(rootListenerCallback).toHaveBeenCalledTimes(0);
      unregister();
      expect(rootListener).toHaveBeenCalledTimes(2);
      expect(rootListener).toHaveBeenLastCalledWith(null, null);
      // Only the first call returns the function
      expect(rootListenerCallback).toHaveBeenCalledTimes(1);
    });
    test('works when the root element changes too', () => {
      const editor = buildEditorFromExtensions({name: '@test'});
      const rootListenerCallback = vi.fn();
      const rootListener = vi
        .fn()
        .mockImplementation((nextRoot, prevRoot) =>
          rootListenerCallback.bind(null, nextRoot, prevRoot),
        );
      const initialRoot = document.createElement('div');
      const nextRoot = document.createElement('div');
      editor.setRootElement(initialRoot);
      const unregister = editor.registerRootListener(rootListener);
      expect(rootListenerCallback).toHaveBeenCalledTimes(0);
      editor.setRootElement(nextRoot);
      editor.setRootElement(null);
      editor.setRootElement(initialRoot);
      // We haven't unregistered the call to initialRoot yet
      expect(rootListenerCallback.mock.calls).toEqual([
        [initialRoot, null],
        [nextRoot, initialRoot],
        [null, nextRoot],
      ]);
      unregister();
      expect(rootListenerCallback.mock.calls).toEqual([
        [initialRoot, null],
        [nextRoot, initialRoot],
        [null, nextRoot],
        [initialRoot, null],
        [null, initialRoot],
      ]);
    });
  });
});
