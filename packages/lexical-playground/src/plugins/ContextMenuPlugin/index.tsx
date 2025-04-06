/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

// import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  // LexicalContextMenuPlugin,
  MenuOption,
} from '@lexical/react/LexicalContextMenuPlugin';
import {
  // $getNearestNodeFromDOMNode,
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  COPY_COMMAND,
  CUT_COMMAND,
  type LexicalNode,
  PASTE_COMMAND,
} from 'lexical';
import {useCallback, useMemo, useState} from 'react';
import * as React from 'react';

import {Menu, MenuItem} from './FloatingContextMenuPlugin';

export class ContextMenuOption extends MenuOption {
  title: string;
  onSelect: (targetNode: LexicalNode | null) => void;
  constructor(
    title: string,
    options: {
      onSelect: (targetNode: LexicalNode | null) => void;
    },
  ) {
    super(title);
    this.title = title;
    this.onSelect = options.onSelect.bind(this);
  }
}

export default function ContextMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const defaultOptions = useMemo(() => {
    return [
      new ContextMenuOption(`Copy`, {
        onSelect: () => {
          editor.dispatchCommand(COPY_COMMAND, null);
        },
      }),
      new ContextMenuOption(`Cut`, {
        onSelect: () => {
          editor.dispatchCommand(CUT_COMMAND, null);
        },
      }),
      new ContextMenuOption(`Paste`, {
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

  const [options, setOptions] = useState(defaultOptions);
  setOptions(defaultOptions); // IVO: delete this
  const onSelectOption = useCallback(
    (selectedOption: ContextMenuOption) => {
      editor.update(() => {
        selectedOption.onSelect();
      });
    },
    [editor],
  );

  // const onWillOpen = (event: MouseEvent) => {
  //   let newOptions = defaultOptions;
  //   editor.read(() => {
  //     const node = $getNearestNodeFromDOMNode(event.target as Element);
  //     if (node) {
  //       const parent = node.getParent();
  //       if ($isLinkNode(parent)) {
  //         newOptions = [
  //           new ContextMenuOption(`Remove Link`, {
  //             onSelect: () => {
  //               editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
  //             },
  //           }),
  //           ...defaultOptions,
  //         ];
  //       }
  //     }
  //   });
  //   setOptions(newOptions);
  // };

  return (
    <Menu>
      {options.map((option) => (
        <MenuItem
          key={option.title}
          label={option.title}
          disabled={false}
          onClick={() => onSelectOption(option)}
        />
      ))}
    </Menu>
  );
}
