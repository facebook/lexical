/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CommentStore} from './index';

import {$isMarkNode, $unwrapMarkNode, MarkNode} from '@lexical/mark';
import {
  $getNodeByKey,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type NodeKey,
} from 'lexical';

export function $pruneStaleMarkNodeIDs(
  markNode: MarkNode,
  hasThread: (id: string) => boolean,
): void {
  for (const id of markNode.getIDs()) {
    if (!hasThread(id)) {
      markNode.deleteID(id);
    }
  }
  if (markNode.getIDs().length === 0) {
    $unwrapMarkNode(markNode);
  }
}

export function registerCommentMarkHistorySync(
  editor: LexicalEditor,
  commentStore: CommentStore,
): () => void {
  const priorIDs = new Map<NodeKey, readonly string[]>();

  return editor.registerMutationListener(
    MarkNode,
    (mutations, {updateTags}) => {
      const isHistoric = updateTags.has(HISTORIC_TAG);
      const toRestore = new Set<string>();
      const toRetire = new Set<string>();
      const afterByKey = new Map<NodeKey, readonly string[]>();

      editor.read('latest', () => {
        for (const [key, mutation] of mutations) {
          const before = priorIDs.get(key) ?? [];
          const node = mutation === 'destroyed' ? null : $getNodeByKey(key);
          const after = $isMarkNode(node) ? node.getIDs() : [];
          afterByKey.set(key, after);

          if (isHistoric) {
            for (const id of after) {
              if (!before.includes(id) && !commentStore.hasThread(id)) {
                toRestore.add(id);
              }
            }
            for (const id of before) {
              if (!after.includes(id) && commentStore.hasThread(id)) {
                toRetire.add(id);
              }
            }
          }

          if (mutation === 'destroyed') {
            priorIDs.delete(key);
          } else {
            priorIDs.set(key, after);
          }
        }
      });

      if (!isHistoric) {
        return;
      }

      for (const id of toRestore) {
        commentStore.restoreThread(id);
      }
      for (const id of toRetire) {
        commentStore.retireThread(id);
      }

      const staleKeys: NodeKey[] = [];
      for (const [key, after] of afterByKey) {
        if (after.some(id => !commentStore.hasThread(id))) {
          staleKeys.push(key);
        }
      }

      if (staleKeys.length === 0) {
        return;
      }

      setTimeout(() => {
        editor.update(
          () => {
            for (const key of staleKeys) {
              const node = $getNodeByKey(key);
              if ($isMarkNode(node)) {
                $pruneStaleMarkNodeIDs(node, id => commentStore.hasThread(id));
              }
            }
          },
          {tag: HISTORY_MERGE_TAG},
        );
      });
    },
    {skipInitialization: true},
  );
}
