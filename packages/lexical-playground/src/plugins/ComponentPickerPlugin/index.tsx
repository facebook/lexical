/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeNode} from '@lexical/code';
import {
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '@lexical/extension';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from '@lexical/list';
import {INSERT_EMBED_COMMAND} from '@lexical/react/LexicalAutoEmbedPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {INSERT_TABLE_COMMAND, TableNode} from '@lexical/table';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {type JSX, useCallback, useMemo, useState} from 'react';

import useModal from '../../hooks/useModal';
import catTypingGif from '../../images/cat-typing.gif';
import {DateTimeNode} from '../../nodes/DateTimeNode/DateTimeNode';
import {EquationNode} from '../../nodes/EquationNode';
import {ExcalidrawNode} from '../../nodes/ExcalidrawNode';
import {ImageNode} from '../../nodes/ImageNode';
import {LayoutContainerNode} from '../../nodes/LayoutContainerNode';
import {PageBreakNode} from '../../nodes/PageBreakNode';
import {PollNode} from '../../nodes/PollNode';
import {EmbedConfigs} from '../AutoEmbedPlugin';
import {INSERT_CARD_COMMAND} from '../CardExtension';
import {CardNode} from '../CardExtension/CardNode';
import {INSERT_COLLAPSIBLE_COMMAND} from '../CollapsibleExtension';
import {CollapsibleContainerNode} from '../CollapsibleExtension/CollapsibleContainerNode';
import {INSERT_DATETIME_COMMAND} from '../DateTimeExtension';
import {InsertEquationDialog} from '../EquationsExtension';
import {INSERT_EXCALIDRAW_COMMAND} from '../ExcalidrawExtension';
import {INSERT_IMAGE_COMMAND, InsertImageDialog} from '../ImagesExtension';
import InsertLayoutDialog from '../LayoutExtension/InsertLayoutDialog';
import {INSERT_PAGE_BREAK} from '../PageBreakExtension';
import {
  INSERT_PAGE_COUNT_COMMAND,
  INSERT_PAGE_NUMBER_COMMAND,
  PageCountNode,
  PageNumberNode,
} from '../PagesExtension/PageCounterNodes';
import {InsertPollDialog} from '../PollExtension';
import {INSERT_PULLQUOTE_COMMAND} from '../PullQuoteExtension';
import {PullQuoteNode} from '../PullQuoteExtension/PullQuoteNode';
import {INSERT_REVIEW_COMMAND} from '../ReviewExtension';
import {ReviewNode} from '../ReviewExtension/ReviewNode';
import {InsertTableDialog} from '../TablePlugin';

export class ComponentPickerOption extends MenuOption {
  // What shows up in the editor
  title: string;
  // Icon for display
  icon?: JSX.Element;
  // For extra searching.
  keywords: string[];
  // TBD
  keyboardShortcut?: string;
  // Nodes the option inserts; it is offered only in editors that register
  // them all (a page header has no page breaks, say).
  nodes?: Klass<LexicalNode>[];
  // What happens when you select this option?
  onSelect: (queryString: string) => void;

  constructor(
    title: string,
    options: {
      icon?: JSX.Element;
      keywords?: string[];
      keyboardShortcut?: string;
      nodes?: Klass<LexicalNode>[];
      onSelect: (queryString: string) => void;
    },
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    this.icon = options.icon;
    this.keyboardShortcut = options.keyboardShortcut;
    this.nodes = options.nodes;
    this.onSelect = options.onSelect.bind(this);
  }
}

export function ComponentPickerMenuItem({
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

export function getDynamicOptions(editor: LexicalEditor, queryString: string) {
  const options: ComponentPickerOption[] = [];

  if (queryString == null) {
    return options;
  }

  const tableMatch = queryString.match(/^([1-9]\d?)(?:x([1-9]\d?)?)?$/);

  if (tableMatch !== null && editor.hasNodes([TableNode])) {
    const rows = tableMatch[1];
    const colOptions = tableMatch[2]
      ? [tableMatch[2]]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String);

    options.push(
      ...colOptions.map(
        columns =>
          new ComponentPickerOption(`${rows}x${columns} Table`, {
            icon: <i className="icon table" />,
            keywords: ['table'],
            onSelect: () =>
              editor.dispatchCommand(INSERT_TABLE_COMMAND, {columns, rows}),
          }),
      ),
    );
  }

  return options;
}

export type ShowModal = ReturnType<typeof useModal>[1];

export function getBaseOptions(editor: LexicalEditor, showModal: ShowModal) {
  const options = [
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
      n =>
        new ComponentPickerOption(`Heading ${n}`, {
          icon: <i className={`icon h${n}`} />,
          keywords: ['heading', 'header', `h${n}`],
          nodes: [HeadingNode],
          onSelect: () =>
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode(`h${n}`));
              }
            }),
        }),
    ),
    new ComponentPickerOption('Table', {
      icon: <i className="icon table" />,
      keywords: ['table', 'grid', 'spreadsheet', 'rows', 'columns'],
      nodes: [TableNode],
      onSelect: () =>
        showModal('Insert Table', onClose => (
          <InsertTableDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    new ComponentPickerOption('Numbered List', {
      icon: <i className="icon number" />,
      keywords: ['numbered list', 'ordered list', 'ol'],
      nodes: [ListNode],
      onSelect: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND),
    }),
    new ComponentPickerOption('Bulleted List', {
      icon: <i className="icon bullet" />,
      keywords: ['bulleted list', 'unordered list', 'ul'],
      nodes: [ListNode],
      onSelect: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND),
    }),
    new ComponentPickerOption('Check List', {
      icon: <i className="icon check" />,
      keywords: ['check list', 'todo list'],
      nodes: [ListNode],
      onSelect: () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND),
    }),
    new ComponentPickerOption('Quote', {
      icon: <i className="icon quote" />,
      keywords: ['block quote'],
      nodes: [QuoteNode],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        }),
    }),
    new ComponentPickerOption('Code', {
      icon: <i className="icon code" />,
      keywords: ['javascript', 'python', 'js', 'codeblock'],
      nodes: [CodeNode],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            if (selection.isCollapsed()) {
              $setBlocksType(selection, () => $createCodeNode());
            } else {
              // Will this ever happen?
              const textContent = selection.getTextContent();
              const codeNode = $createCodeNode();
              selection.insertNodes([codeNode]);
              selection.insertRawText(textContent);
            }
          }
        }),
    }),
    new ComponentPickerOption('Divider', {
      icon: <i className="icon horizontal-rule" />,
      keywords: ['horizontal rule', 'divider', 'hr'],
      nodes: [HorizontalRuleNode],
      onSelect: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND),
    }),
    new ComponentPickerOption('Page Break', {
      icon: <i className="icon page-break" />,
      keywords: ['page break', 'divider'],
      nodes: [PageBreakNode],
      onSelect: () => editor.dispatchCommand(INSERT_PAGE_BREAK),
    }),
    new ComponentPickerOption('Page Number', {
      icon: <i className="icon page-number" />,
      keywords: ['page number', 'page', 'number', 'header', 'footer'],
      nodes: [PageNumberNode],
      onSelect: () =>
        editor.dispatchCommand(INSERT_PAGE_NUMBER_COMMAND, undefined),
    }),
    new ComponentPickerOption('Page Count', {
      icon: <i className="icon page-count" />,
      keywords: ['page count', 'pages', 'total', 'header', 'footer'],
      nodes: [PageCountNode],
      onSelect: () =>
        editor.dispatchCommand(INSERT_PAGE_COUNT_COMMAND, undefined),
    }),
    new ComponentPickerOption('Excalidraw', {
      icon: <i className="icon diagram-2" />,
      keywords: ['excalidraw', 'diagram', 'drawing'],
      nodes: [ExcalidrawNode],
      onSelect: () => editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND),
    }),
    new ComponentPickerOption('Poll', {
      icon: <i className="icon poll" />,
      keywords: ['poll', 'vote'],
      nodes: [PollNode],
      onSelect: () =>
        showModal('Insert Poll', onClose => (
          <InsertPollDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    ...EmbedConfigs.map(
      embedConfig =>
        new ComponentPickerOption(`Embed ${embedConfig.contentName}`, {
          icon: embedConfig.icon,
          keywords: [...embedConfig.keywords, 'embed'],
          nodes: [embedConfig.node],
          onSelect: () =>
            editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type),
        }),
    ),
    new ComponentPickerOption('Date', {
      icon: <i className="icon calendar" />,
      keywords: ['date', 'calendar', 'time'],
      nodes: [DateTimeNode],
      onSelect: () => {
        const dateTime = new Date();
        dateTime.setHours(0, 0, 0, 0); // Set time to midnight
        editor.dispatchCommand(INSERT_DATETIME_COMMAND, {dateTime});
      },
    }),
    new ComponentPickerOption('Today', {
      icon: <i className="icon calendar" />,
      keywords: ['date', 'calendar', 'time', 'today'],
      nodes: [DateTimeNode],
      onSelect: () => {
        const dateTime = new Date();
        dateTime.setHours(0, 0, 0, 0); // Set time to midnight
        editor.dispatchCommand(INSERT_DATETIME_COMMAND, {dateTime});
      },
    }),
    new ComponentPickerOption('Tomorrow', {
      icon: <i className="icon calendar" />,
      keywords: ['date', 'calendar', 'time', 'tomorrow'],
      nodes: [DateTimeNode],
      onSelect: () => {
        const dateTime = new Date();
        dateTime.setDate(dateTime.getDate() + 1);
        dateTime.setHours(0, 0, 0, 0); // Set time to midnight
        editor.dispatchCommand(INSERT_DATETIME_COMMAND, {dateTime});
      },
    }),
    new ComponentPickerOption('Yesterday', {
      icon: <i className="icon calendar" />,
      keywords: ['date', 'calendar', 'time', 'yesterday'],
      nodes: [DateTimeNode],
      onSelect: () => {
        const dateTime = new Date();
        dateTime.setDate(dateTime.getDate() - 1);
        dateTime.setHours(0, 0, 0, 0); // Set time to midnight
        editor.dispatchCommand(INSERT_DATETIME_COMMAND, {dateTime});
      },
    }),
    new ComponentPickerOption('Equation', {
      icon: <i className="icon equation" />,
      keywords: ['equation', 'latex', 'math'],
      nodes: [EquationNode],
      onSelect: () =>
        showModal('Insert Equation', onClose => (
          <InsertEquationDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    new ComponentPickerOption('GIF', {
      icon: <i className="icon gif" />,
      keywords: ['gif', 'animate', 'image', 'file'],
      nodes: [ImageNode],
      onSelect: () =>
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
          altText: 'Cat typing on a laptop',
          src: catTypingGif,
        }),
    }),
    new ComponentPickerOption('Image', {
      icon: <i className="icon image" />,
      keywords: ['image', 'photo', 'picture', 'file'],
      nodes: [ImageNode],
      onSelect: () =>
        showModal('Insert Image', onClose => (
          <InsertImageDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    new ComponentPickerOption('Collapsible', {
      icon: <i className="icon caret-right" />,
      keywords: ['collapse', 'collapsible', 'toggle'],
      nodes: [CollapsibleContainerNode],
      onSelect: () => editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND),
    }),
    new ComponentPickerOption('Card', {
      icon: <i className="icon caret-right" />,
      keywords: ['card', 'slot', 'named slots'],
      nodes: [CardNode],
      onSelect: () => editor.dispatchCommand(INSERT_CARD_COMMAND),
    }),
    new ComponentPickerOption('Pull Quote', {
      icon: <i className="icon quote" />,
      keywords: ['pull quote', 'quote', 'attribution', 'cite', 'slot'],
      nodes: [PullQuoteNode],
      onSelect: () => editor.dispatchCommand(INSERT_PULLQUOTE_COMMAND),
    }),
    new ComponentPickerOption('Review', {
      icon: <i className="icon star" />,
      keywords: ['review', 'testimonial', 'rating', 'stars', 'react', 'slot'],
      nodes: [ReviewNode],
      onSelect: () => editor.dispatchCommand(INSERT_REVIEW_COMMAND),
    }),
    new ComponentPickerOption('Columns Layout', {
      icon: <i className="icon columns" />,
      keywords: ['columns', 'layout', 'grid'],
      nodes: [LayoutContainerNode],
      onSelect: () =>
        showModal('Insert Columns Layout', onClose => (
          <InsertLayoutDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    ...(['left', 'center', 'right', 'justify'] as const).map(
      alignment =>
        new ComponentPickerOption(`Align ${alignment}`, {
          icon: <i className={`icon ${alignment}-align`} />,
          keywords: ['align', 'justify', alignment],
          onSelect: () =>
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
        }),
    ),
  ];
  return options.filter(
    option => option.nodes === undefined || editor.hasNodes(option.nodes),
  );
}

export default function ComponentPickerMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useModal();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    allowWhitespace: true,
    minLength: 0,
  });

  const options = useMemo(() => {
    const baseOptions = getBaseOptions(editor, showModal);

    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, 'i');

    return [
      ...getDynamicOptions(editor, queryString),
      ...baseOptions.filter(
        option =>
          regex.test(option.title) ||
          option.keywords.some(keyword => regex.test(keyword)),
      ),
    ];
  }, [editor, queryString, showModal]);

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
      {modal}
      <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
      />
    </>
  );
}
