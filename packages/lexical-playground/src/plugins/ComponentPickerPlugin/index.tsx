/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  LexicalEditor,
  TextNode,
} from 'lexical';
import { useCallback, useMemo, useState, useContext } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { TurboFrameEmbedConfigs, createEmbedRecordAndInsertTurboFrameNode } from '@/components/editor/plugins/TurboFramePlugin';
import { EditorContext } from '@/components/editor/editor-component';

class ComponentPickerOption extends MenuOption {
  // What shows up in the editor
  title: string;
  // Icon for display
  icon?: JSX.Element;
  // For extra searching.
  keywords: Array<string>;
  // TBD
  keyboardShortcut?: string;
  // What happens when you select this option?
  onSelect: (queryString: string) => void;

  constructor(
    title: string,
    options: {
      icon?: JSX.Element;
      keywords?: Array<string>;
      keyboardShortcut?: string;
      onSelect: (queryString: string) => void;
    },
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    this.icon = options.icon;
    this.keyboardShortcut = options.keyboardShortcut;
    this.onSelect = options.onSelect.bind(this);
  }
}

function ComponentPickerMenuItem({
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
  option: ComponentPickerOption;
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
      {option.icon}
      <span className="text">{option.title}</span>
    </li>
  );
}

function getDynamicOptions(editor: LexicalEditor, queryString: string) {
  const options: Array<ComponentPickerOption> = [];

  if (queryString == null) {
    return options;
  }

  const tableMatch = queryString.match(/^([1-9]\d?)(?:x([1-9]\d?)?)?$/);

  if (tableMatch !== null) {
    const rows = tableMatch[1];
    const colOptions = tableMatch[2]
      ? [tableMatch[2]]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String);

    options.push(
      ...colOptions.map(
        (columns) =>
          new ComponentPickerOption(`${rows}x${columns} Table`, {
            icon: <i className="icon table" />,
            keywords: ['table'],
            onSelect: () =>
              editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns, rows }),
          }),
      ),
    );
  }

  return options;
}

function getBaseOptions(editor: LexicalEditor, embedScopingPath: string) {
  return [
    new ComponentPickerOption('Paragraph', {
      icon: <i className="icon paragraph" />,
      keywords: ['normal', 'paragraph', 'p', 'text'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        }),
    }),
    ...([1, 2, 3] as const).map(
      (n) =>
        new ComponentPickerOption(`Heading ${n}`, {
          icon: <i className={`icon h${n}`} />,
          keywords: ['heading', 'header', `h${n}`],
          onSelect: () =>
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode(`h${n}`));
              }
            }),
        }),
    ),
    new ComponentPickerOption('Numbered List', {
      icon: <i className="icon number" />,
      keywords: ['numbered list', 'ordered list', 'ol'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Bulleted List', {
      icon: <i className="icon bullet" />,
      keywords: ['bulleted list', 'unordered list', 'ul'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Check List', {
      icon: <i className="icon check" />,
      keywords: ['check list', 'todo list'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Quote', {
      icon: <i className="icon quote" />,
      keywords: ['block quote'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        }),
    }),
    new ComponentPickerOption('Divider', {
      icon: <i className="icon horizontal-rule" />,
      keywords: ['horizontal rule', 'divider', 'hr'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
    }),
    ...TurboFrameEmbedConfigs.map(
      (turboFrameEmbedConfig) =>
        new ComponentPickerOption(`${turboFrameEmbedConfig.contentName}`, {
          icon: turboFrameEmbedConfig.icon,
          keywords: [...turboFrameEmbedConfig.keywords, 'embed'],
          onSelect: () => createEmbedRecordAndInsertTurboFrameNode(editor, embedScopingPath, turboFrameEmbedConfig),
        }),
    ),
  ];
}

export default function ComponentPickerMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  // const [modal, showModal] = useModal();
  const [queryString, setQueryString] = useState<string | null>(null);
  const embedScopingPath = useContext(EditorContext).embedScopingPath;


  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const options = useMemo(() => {
    const baseOptions = getBaseOptions(editor, embedScopingPath);

    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, 'i');

    return [
      ...getDynamicOptions(editor, queryString),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword)),
      ),
    ];
  }, [editor, queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect(matchingString);
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <>
      <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
        ) =>
          anchorElementRef.current && options.length
            ? ReactDOM.createPortal(
              <div className="editor-typeahead-popover component-picker-menu">
                <ul>
                  {options.map((option, i: number) => (
                    <ComponentPickerMenuItem
                      index={i}
                      isSelected={selectedIndex === i}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(i);
                      }}
                      key={option.key}
                      option={option}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current,
            )
            : null
        }
      />
    </>
  );
}
