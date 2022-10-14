/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isHeadingNode} from '@lexical/rich-text';
import {$dfs} from '@lexical/utils';
import {NodeKey} from 'lexical';
import {useEffect, useState} from 'react';
import debounce from 'shared/debounce';

const DEBOUNCE_NODE_SIZE = 100;
const DEBOUNCE_MS = 500;

export default function useLexicalTableOfContents(): NodeKey[] {
  const [editor] = useLexicalComposerContext();
  const [nodeKeys, setNodeKeys] = useState<NodeKey[]>([]);
  useEffect(() => {
    const compute = debounce(() => {
      editor.getEditorState().read(() => {
        const currentNodeKeys = [];
        for (const {node} of $dfs()) {
          if ($isHeadingNode(node) && node.getTextContentSize() > 0) {
            currentNodeKeys.push(node.getKey());
          }
        }
        setNodeKeys(currentNodeKeys);
      });
    }, DEBOUNCE_MS);
    function computeOrDebounce() {
      if (editor.getEditorState()._nodeMap.size >= DEBOUNCE_NODE_SIZE) {
        compute();
      } else {
        compute(undefined, true);
      }
    }
    computeOrDebounce();
    return editor.registerUpdateListener(() => {
      computeOrDebounce();
    });
  }, [editor]);
  return nodeKeys;
}
