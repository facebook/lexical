/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementFormatType, NodeKey} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isDecoratorBlockNode} from '@lexical/react/LexicalDecoratorBlockNode';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
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
import {ReactNode, useCallback, useEffect, useRef} from 'react';

type Props = Readonly<{
  children: ReactNode;
  format: ElementFormatType | null | undefined;
  nodeKey: NodeKey;
  className: Readonly<{
    base: string;
    focus: string;
  }>;
}>;

export function BlockWithAlignableContents({
  children,
  format,
  nodeKey,
  className,
}: Props): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const ref = useRef(null);

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);

          if ($isDecoratorNode(node)) {
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
      editor.registerCommand<ElementFormatType>(
        FORMAT_ELEMENT_COMMAND,
        (formatType) => {
          if (isSelected) {
            const selection = $getSelection();

            if ($isNodeSelection(selection)) {
              const node = $getNodeByKey(nodeKey);

              if ($isDecoratorBlockNode(node)) {
                node.setFormat(formatType);
              }
            } else if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes();

              for (const node of nodes) {
                if ($isDecoratorBlockNode(node)) {
                  node.setFormat(formatType);
                } else {
                  const element = $getNearestBlockElementAncestorOrThrow(node);
                  element.setFormat(formatType);
                }
              }
            }

            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (event) => {
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
      className={[className.base, isSelected ? className.focus : null]
        .filter(Boolean)
        .join(' ')}
      ref={ref}
      style={{
        textAlign: format ? format : undefined,
      }}>
      {children}
    </div>
  );
}
