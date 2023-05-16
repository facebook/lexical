/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalContextMenuPlugin,
  MenuOption,
} from '@lexical/react/LexicalContextMenuPlugin';
import {
  type LexicalNode,
  COPY_COMMAND,
  CUT_COMMAND,
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
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}>
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
            onClick={() => {
              onOptionClick(option, i);
            }}
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
  onSelect: (targetNode: LexicalNode | null, close: () => void) => void;
  constructor(
    title: string,
    options: {
      onSelect: (targetNode: LexicalNode | null, close: () => void) => void;
    },
  ) {
    super(title);
    this.title = title;
    this.onSelect = options.onSelect.bind(this);
  }
}

export default function ContextMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const options = useMemo(() => {
    // if (isCopy(keyCode, event.shiftKey, event.metaKey, event.ctrlKey)) {
    //   editor.dispatchCommand(COPY_COMMAND, event);
    //   return;
    // }
    // if (isCut(keyCode, event.shiftKey, event.metaKey, event.ctrlKey)) {
    //   editor.dispatchCommand(CUT_COMMAND, event);
    //   return;
    // }
    // if (isPaste(keyCode, event.shiftKey, event.metaKey, event.ctrlKey)) {
    //   editor.dispatchCommand(PASTE_COMMAND, event);
    //   return;
    // }

    return [
      new ContextMenuOption(`Copy`, {
        onSelect: (_node, close) => {
          editor.dispatchCommand(COPY_COMMAND, null);
          close();
        },
      }),
      new ContextMenuOption(`Cut`, {
        onSelect: (_node, close) => {
          editor.dispatchCommand(CUT_COMMAND, null);
          close();
        },
      }),
      new ContextMenuOption(`Paste`, {
        onSelect: (_node, close) => {
          navigator.clipboard.read().then(async (...args) => {
            const data = new DataTransfer();

            const items = await navigator.clipboard.read();
            const item = items[0];

            const permission = await navigator.permissions.query({
              // @ts-ignore These types are incorrect.
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

            close();
          });
        },
      }),
      new ContextMenuOption('Dismiss', {
        onSelect: () => 'selected dismiss',
      }),
    ];
  }, [editor]);

  const onSelectOption = useCallback(
    (
      selectedOption: ContextMenuOption,
      targetNode: LexicalNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        selectedOption.onSelect(targetNode, closeMenu);
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalContextMenuPlugin
      options={options}
      onSelectOption={onSelectOption}
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
              // eslint-disable-next-line jsx-a11y/no-static-element-interactions
              <div
                className="typeahead-popover auto-embed-menu"
                style={{
                  marginLeft: anchorElementRef.current.style.width,
                  userSelect: 'none',
                  width: 200,
                }}
                ref={setMenuRef}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}>
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
