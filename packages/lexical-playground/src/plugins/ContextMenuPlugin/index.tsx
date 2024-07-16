/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalContextMenuPlugin,
  MenuOption,
} from '@lexical/react/LexicalContextMenuPlugin';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isRangeSelection,
  COPY_COMMAND,
  CUT_COMMAND,
  type LexicalNode,
  PASTE_COMMAND,
} from 'lexical';
import {useCallback, useMemo} from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

function ContextMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: ContextMenuOption;
}) {
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={className}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      <span className="text">{option.title}</span>
    </li>
  );
}

function ContextMenu({
  options,
  selectedItemIndex,
  onOptionClick,
  onOptionMouseEnter,
}: {
  selectedItemIndex: number | null;
  onOptionClick: (option: ContextMenuOption, index: number) => void;
  onOptionMouseEnter: (index: number) => void;
  options: Array<ContextMenuOption>;
}) {
  return (
    <div className="typeahead-popover">
      <ul>
        {options.map((option: ContextMenuOption, i: number) => (
          <ContextMenuItem
            index={i}
            isSelected={selectedItemIndex === i}
            onClick={() => onOptionClick(option, i)}
            onMouseEnter={() => onOptionMouseEnter(i)}
            key={option.key}
            option={option}
          />
        ))}
      </ul>
    </div>
  );
}

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
        onSelect: (_node) => {
          editor.dispatchCommand(COPY_COMMAND, null);
        },
      }),
      new ContextMenuOption(`Cut`, {
        onSelect: (_node) => {
          editor.dispatchCommand(CUT_COMMAND, null);
        },
      }),
      new ContextMenuOption(`Paste`, {
        onSelect: (_node) => {
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
        onSelect: (_node) => {
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
        onSelect: (_node) => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const currentNode = selection.anchor.getNode();
            const ancestorNodeWithRootAsParent = currentNode
              .getParents()
              .at(-2);

            ancestorNodeWithRootAsParent?.remove();
          }
        },
      }),
    ];
  }, [editor]);

  const [options, setOptions] = React.useState(defaultOptions);

  const onSelectOption = useCallback(
    (
      selectedOption: ContextMenuOption,
      targetNode: LexicalNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        selectedOption.onSelect(targetNode);
        closeMenu();
      });
    },
    [editor],
  );

  const onWillOpen = (event: MouseEvent) => {
    let newOptions = defaultOptions;
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(event.target as Element);
      if (node) {
        const parent = node.getParent();
        if ($isLinkNode(parent)) {
          newOptions = [
            new ContextMenuOption(`Remove Link`, {
              onSelect: (_node) => {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
              },
            }),
            ...defaultOptions,
          ];
        }
      }
    });
    setOptions(newOptions);
  };

  return (
    <LexicalContextMenuPlugin
      options={options}
      onSelectOption={onSelectOption}
      onWillOpen={onWillOpen}
      menuRenderFn={(
        anchorElementRef,
        {
          selectedIndex,
          options: _options,
          selectOptionAndCleanUp,
          setHighlightedIndex,
        },
        {setMenuRef},
      ) =>
        anchorElementRef.current
          ? ReactDOM.createPortal(
              <div
                className="typeahead-popover auto-embed-menu"
                style={{
                  marginLeft: anchorElementRef.current.style.width,
                  userSelect: 'none',
                  width: 200,
                }}
                ref={setMenuRef}>
                <ContextMenu
                  options={options}
                  selectedItemIndex={selectedIndex}
                  onOptionClick={(option: ContextMenuOption, index: number) => {
                    setHighlightedIndex(index);
                    selectOptionAndCleanUp(option);
                  }}
                  onOptionMouseEnter={(index: number) => {
                    setHighlightedIndex(index);
                  }}
                />
              </div>,
              anchorElementRef.current,
            )
          : null
      }
    />
  );
}
