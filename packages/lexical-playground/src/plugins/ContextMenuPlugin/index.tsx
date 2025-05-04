/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  ContextMenu,
  ContextMenuOption,
} from '@lexical/react/LexicalContextMenuPlugin';
import {
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  COPY_COMMAND,
  CUT_COMMAND,
  type LexicalNode,
  PASTE_COMMAND,
} from 'lexical';
import {useMemo} from 'react';

export default function ContextMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const defaultOptions = useMemo(() => {
    return [
      new ContextMenuOption(`Cut`, {
        disabled: false,
        onSelect: () => {
          editor.dispatchCommand(CUT_COMMAND, null);
        },
      }),
      new ContextMenuOption(`Copy`, {
        disabled: false,
        onSelect: () => {
          editor.dispatchCommand(COPY_COMMAND, null);
        },
      }),
      new ContextMenuOption(`Paste`, {
        disabled: false,
        onSelect: () => {
          navigator.clipboard.read().then(async function (...args) {
            const data = new DataTransfer();

            const items = await navigator.clipboard.read();
            const item = items[0];

            const permission = await navigator.permissions.query({
              // @ts-expect-error These types are incorrect.
              name: 'clipboard-read',
            });
            if (permission.state === 'denied') {
              alert('Not allowed to paste from clipboard.');
              return;
            }

            for (const type of item.types) {
              const dataString = await (await item.getType(type)).text();
              data.setData(type, dataString);
            }

            const event = new ClipboardEvent('paste', {
              clipboardData: data,
            });

            editor.dispatchCommand(PASTE_COMMAND, event);
          });
        },
      }),
      new ContextMenuOption(`Paste as Plain Text`, {
        disabled: false,
        onSelect: () => {
          navigator.clipboard.read().then(async function (...args) {
            const permission = await navigator.permissions.query({
              // @ts-expect-error These types are incorrect.
              name: 'clipboard-read',
            });

            if (permission.state === 'denied') {
              alert('Not allowed to paste from clipboard.');
              return;
            }

            const data = new DataTransfer();
            const items = await navigator.clipboard.readText();
            data.setData('text/plain', items);

            const event = new ClipboardEvent('paste', {
              clipboardData: data,
            });
            editor.dispatchCommand(PASTE_COMMAND, event);
          });
        },
      }),
      new ContextMenuOption(`Delete Node`, {
        disabled: false,
        onSelect: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const currentNode = selection.anchor.getNode();
            const ancestorNodeWithRootAsParent = currentNode
              .getParents()
              .at(-2);

            ancestorNodeWithRootAsParent?.remove();
          } else if ($isNodeSelection(selection)) {
            const selectedNodes = selection.getNodes();
            selectedNodes.forEach((node) => {
              if ($isDecoratorNode(node)) {
                node.remove();
              }
            });
          }
        },
      }),
    ];
  }, [editor]);

  const conditionalOptions = useMemo(() => {
    return {
      link: {
        options: [
          new ContextMenuOption(`Remove Link`, {
            disabled: false,
            onSelect: () => {
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
            },
          }),
        ],
        showOn: (node: LexicalNode) => $isLinkNode(node.getParent()),
      },
    };
  }, [editor]);

  return (
    <ContextMenu
      defaultOptions={defaultOptions}
      conditionalOptions={conditionalOptions}
    />
  );
}
