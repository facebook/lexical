/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getNodeByKey,
  $getSelection,
  defineExtension,
  type NodeKey,
} from 'lexical';

import {EditorStateExtension} from './EditorStateExtension';
import {batch, computed, effect, ReadonlySignal, signal} from './signals';

const EMPTY_SET = new Set<NodeKey>();

export const NodeSelectionExtension = defineExtension({
  build(editor, config, state) {
    const editorStateStore = state.getDependency(EditorStateExtension).output;
    const watchedNodeStore = signal({
      watchedNodeKeys: new Map<NodeKey, Set<ReadonlySignal<boolean>>>(),
    });
    let dispose: undefined | (() => void);
    const selectedNodeKeys = signal<undefined | Set<NodeKey>>(undefined, {
      unwatched: () => {
        if (dispose) {
          dispose();
          dispose = undefined;
        }
      },
      watched: () => {
        dispose = effect(() => {
          const prevSelectedNodeKeys = selectedNodeKeys.peek();
          const {watchedNodeKeys} = watchedNodeStore.value;
          let nextSelectedNodeKeys: undefined | Set<string>;
          let didChange = false;
          let unwatchedKeys = false;
          editorStateStore.value.read(() => {
            const selection = $getSelection();
            if (selection) {
              for (const [key, listeners] of watchedNodeKeys.entries()) {
                if (listeners.size === 0) {
                  unwatchedKeys = true;
                  watchedNodeKeys.delete(key);
                  continue;
                }
                const node = $getNodeByKey(key);
                const isSelected = (node && node.isSelected()) || false;
                didChange =
                  didChange ||
                  isSelected ===
                    (prevSelectedNodeKeys
                      ? prevSelectedNodeKeys.has(key)
                      : isSelected);
                if (isSelected) {
                  nextSelectedNodeKeys = nextSelectedNodeKeys || new Set();
                  nextSelectedNodeKeys.add(key);
                }
              }
            }
          });
          batch(() => {
            if (unwatchedKeys) {
              watchedNodeStore.value = {watchedNodeKeys};
            }
            if (
              didChange ||
              !(
                nextSelectedNodeKeys &&
                prevSelectedNodeKeys &&
                nextSelectedNodeKeys.size === prevSelectedNodeKeys.size
              )
            ) {
              selectedNodeKeys.value = nextSelectedNodeKeys;
            }
          });
        });
      },
    });
    function watchNodeKey(key: NodeKey) {
      const watcher = computed(() =>
        (selectedNodeKeys.value || EMPTY_SET).has(key),
      );
      const {watchedNodeKeys} = watchedNodeStore.peek();
      let listeners = watchedNodeKeys.get(key);
      const hasListener = listeners !== undefined;
      listeners = listeners || new Set();
      listeners.add(watcher);
      if (!hasListener) {
        watchedNodeKeys.set(key, listeners);
        watchedNodeStore.value = {watchedNodeKeys};
      }
      return watcher;
    }
    return {watchNodeKey};
  },
  dependencies: [EditorStateExtension],
  name: '@lexical/extension/NodeSelection',
});
