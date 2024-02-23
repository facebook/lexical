/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalCommand, LexicalNode, NodeKey} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

import {
  $createLayoutContainerNode,
  $isLayoutContainerNode,
  LayoutContainerNode,
} from '../../nodes/LayoutContainerNode';
import {
  $createLayoutItemNode,
  $isLayoutItemNode,
  LayoutItemNode,
} from '../../nodes/LayoutItemNode';

export const INSERT_LAYOUT_COMMAND: LexicalCommand<string> =
  createCommand<string>();

export const UPDATE_LAYOUT_COMMAND: LexicalCommand<{
  template: string;
  nodeKey: NodeKey;
}> = createCommand<{template: string; nodeKey: NodeKey}>();

export function LayoutPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([LayoutContainerNode, LayoutItemNode])) {
      throw new Error(
        'LayoutPlugin: LayoutContainerNode, or LayoutItemNode not registered on editor',
      );
    }

    const onEscape = (before: boolean) => {
      const selection = $getSelection();
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const container = $findMatchingParent(
          selection.anchor.getNode(),
          $isLayoutContainerNode,
        );

        if ($isLayoutContainerNode(container)) {
          const parent = container.getParent<ElementNode>();
          const child =
            parent &&
            (before
              ? parent.getFirstChild<LexicalNode>()
              : parent?.getLastChild<LexicalNode>());
          const descendant = before
            ? container.getFirstDescendant<LexicalNode>()?.getKey()
            : container.getLastDescendant<LexicalNode>()?.getKey();

          if (
            parent !== null &&
            child === container &&
            selection.anchor.key === descendant
          ) {
            if (before) {
              container.insertBefore($createParagraphNode());
            } else {
              container.insertAfter($createParagraphNode());
            }
          }
        }
      }

      return false;
    };

    return mergeRegister(
      // When layout is the last child pressing down/right arrow will insert paragraph
      // below it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if trailing paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => onEscape(false),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        () => onEscape(false),
        COMMAND_PRIORITY_LOW,
      ),
      // When layout is the first child pressing up/left arrow will insert paragraph
      // above it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if leading paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => onEscape(true),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        () => onEscape(true),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_LAYOUT_COMMAND,
        (template) => {
          editor.update(() => {
            const container = $createLayoutContainerNode(template);
            const itemsCount = getItemsCountFromTemplate(template);

            for (let i = 0; i < itemsCount; i++) {
              container.append(
                $createLayoutItemNode().append($createParagraphNode()),
              );
            }

            $insertNodeToNearestRoot(container);
            container.selectStart();
          });

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        UPDATE_LAYOUT_COMMAND,
        ({template, nodeKey}) => {
          editor.update(() => {
            const container = $getNodeByKey<LexicalNode>(nodeKey);

            if (!$isLayoutContainerNode(container)) {
              return;
            }

            const itemsCount = getItemsCountFromTemplate(template);
            const prevItemsCount = getItemsCountFromTemplate(
              container.getTemplateColumns(),
            );

            // Add or remove extra columns if new template does not match existing one
            if (itemsCount > prevItemsCount) {
              for (let i = prevItemsCount; i < itemsCount; i++) {
                container.append(
                  $createLayoutItemNode().append($createParagraphNode()),
                );
              }
            } else if (itemsCount < prevItemsCount) {
              for (let i = prevItemsCount - 1; i >= itemsCount; i--) {
                const layoutItem = container.getChildAtIndex<LexicalNode>(i);

                if ($isLayoutItemNode(layoutItem)) {
                  layoutItem.remove();
                }
              }
            }

            container.setTemplateColumns(template);
          });

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      // Structure enforcing transformers for each node type. In case nesting structure is not
      // "Container > Item" it'll unwrap nodes and convert it back
      // to regular content.
      editor.registerNodeTransform(LayoutItemNode, (node) => {
        const parent = node.getParent<ElementNode>();
        if (!$isLayoutContainerNode(parent)) {
          const children = node.getChildren<LexicalNode>();
          for (const child of children) {
            node.insertBefore(child);
          }
          node.remove();
        }
      }),
      editor.registerNodeTransform(LayoutContainerNode, (node) => {
        const children = node.getChildren<LexicalNode>();
        if (!children.every($isLayoutItemNode)) {
          for (const child of children) {
            node.insertBefore(child);
          }
          node.remove();
        }
      }),
    );
  }, [editor]);

  return null;
}

function getItemsCountFromTemplate(template: string): number {
  return template.trim().split(/\s+/).length;
}
