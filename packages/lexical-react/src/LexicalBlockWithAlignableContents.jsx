/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementFormatType, NodeKey} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isDecoratorBlockNode} from '@lexical/react/LexicalDecoratorBlockNode';
import useLexicalNodeSelection from '@lexical/react/useLexicalNodeSelection';
import {
  $getNearestBlockElementAncestorOrThrow,
  mergeRegister,
} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef} from 'react';

type Props = $ReadOnly<{
  children: React$Node,
  format: ?ElementFormatType,
  nodeKey: NodeKey,
}>;

export function BlockWithAlignableContents({
  children,
  format,
  nodeKey,
}: Props): React$Node {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const ref = useRef();

  const onDelete = useCallback(
    (payload) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isDecoratorNode(node) && node.isTopLevel()) {
            node.remove();
          }
          setSelected(false);
        });
      }
      return false;
    },
    [editor, isSelected, nodeKey, setSelected],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FORMAT_ELEMENT_COMMAND,
        (payload) => {
          if (isSelected) {
            const selection = $getSelection();
            if ($isNodeSelection(selection)) {
              const node = $getNodeByKey(nodeKey);
              if ($isDecoratorBlockNode(node)) {
                node.setFormat(payload);
              }
            } else if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes();
              for (const node of nodes) {
                if ($isDecoratorBlockNode(node)) {
                  node.setFormat(payload);
                } else {
                  const element = $getNearestBlockElementAncestorOrThrow(node);
                  element.setFormat(payload);
                }
              }
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        (payload) => {
          const event: MouseEvent = payload;
          event.preventDefault();
          if (event.target === ref.current) {
            if (!event.shiftKey) {
              clearSelection();
            }
            setSelected(!isSelected);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);

  return (
    <div
      className={`embed-block${isSelected ? ' focused' : ''}`}
      ref={ref}
      style={{textAlign: format}}>
      {children}
    </div>
  );
}
