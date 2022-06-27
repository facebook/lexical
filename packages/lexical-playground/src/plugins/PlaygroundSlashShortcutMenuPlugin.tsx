/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeNode} from '@lexical/code';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '@lexical/react/LexicalHorizontalRuleNode';
import LexicalSlashShortcutMenuPlugin, {
  OptionResolverFn,
  TypeaheadOption,
} from '@lexical/react/src/LexicalSlashShortcutMenuPlugin';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {$wrapLeafNodesInElements} from '@lexical/selection';
import {INSERT_TABLE_COMMAND, TableNode} from '@lexical/table';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  ParagraphNode,
} from 'lexical';
import {useCallback} from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import useModal from '../hooks/useModal';
import catTypingGif from '../images/cat-typing.gif';
import {EquationNode} from '../nodes/EquationNode';
import {ExcalidrawNode} from '../nodes/ExcalidrawNode';
import {ImageNode} from '../nodes/ImageNode';
import {PollNode} from '../nodes/PollNode';
import {TweetNode} from '../nodes/TweetNode';
import {INSERT_EXCALIDRAW_COMMAND} from './ExcalidrawPlugin';
import {INSERT_IMAGE_COMMAND} from './ImagesPlugin';
import {
  InsertEquationDialog,
  InsertImageDialog,
  InsertPollDialog,
  InsertTableDialog,
  InsertTweetDialog,
} from './ToolbarPlugin';

function ShortcutTypeaheadItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  result,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  result: TypeaheadOption;
}) {
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  return (
    <li
      key={result.key}
      tabIndex={-1}
      className={className}
      ref={(ref) => result.setRefElement(ref)}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      {result.icon}
      <span className="text">{result.title}</span>
    </li>
  );
}

export default function PlaygroundSlashShortcutMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useModal();

  const getDynamicOptions = useCallback(
    (matchingString: string) => {
      const options = [];

      const fullTableRegex = new RegExp(/([1-9]|10)x([1-9]|10)$/);
      const partialTableRegex = new RegExp(/([1-9]|10)x?$/);

      const fullTableMatch = fullTableRegex.exec(matchingString);
      const partialTableMatch = partialTableRegex.exec(matchingString);

      if (fullTableMatch) {
        const [rows, columns] = fullTableMatch[0]
          .split('x')
          .map((n: string) => parseInt(n, 10));

        options.push(
          new TypeaheadOption(`${rows}x${columns} Table`, {
            icon: <i className="icon table" />,
            keywords: ['table'],
            nodeKlass: TableNode,
            onSelect: (_matchingString) =>
              editor.dispatchCommand(INSERT_TABLE_COMMAND, {columns, rows}),
          }),
        );
      } else if (partialTableMatch) {
        const rows = parseInt(partialTableMatch[0], 10);

        options.push(
          ...Array.from({length: 5}, (_, i) => i + 1).map(
            (columns) =>
              new TypeaheadOption(`${rows}x${columns} Table`, {
                icon: <i className="icon table" />,
                keywords: ['table'],
                nodeKlass: TableNode,
                onSelect: (_matchingString) =>
                  editor.dispatchCommand(INSERT_TABLE_COMMAND, {columns, rows}),
              }),
          ),
        );
      }

      return options;
    },
    [editor],
  );

  const getOptions: OptionResolverFn = useCallback(
    (matchingString: string) => {
      const options = [
        new TypeaheadOption('Paragraph', {
          icon: <i className="icon paragraph" />,
          keywords: ['normal', 'p', 'text'],
          nodeKlass: ParagraphNode,
          onSelect: (_matchingString) =>
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $wrapLeafNodesInElements(selection, () =>
                  $createParagraphNode(),
                );
              }
            }),
        }),
        ...Array.from({length: 3}, (_, i) => i + 1).map(
          (n) =>
            new TypeaheadOption(`Heading ${n}`, {
              icon: <i className={`icon h${n}`} />,
              keywords: ['heading', 'header', `h${n}`],
              nodeKlass: HeadingNode,
              onSelect: (_matchingString) =>
                editor.update(() => {
                  const selection = $getSelection();
                  if ($isRangeSelection(selection)) {
                    $wrapLeafNodesInElements(selection, () =>
                      // @ts-ignore
                      $createHeadingNode(`h${n}`),
                    );
                  }
                }),
            }),
        ),
        new TypeaheadOption('Table', {
          icon: <i className="icon table" />,
          keywords: ['table', 'grid', 'spreadsheet', 'rows', 'columns'],
          nodeKlass: TableNode,
          onSelect: (_matchingString) =>
            showModal('Insert Table', (onClose) => (
              <InsertTableDialog activeEditor={editor} onClose={onClose} />
            )),
        }),
        new TypeaheadOption('Numbered List', {
          icon: <i className="icon number" />,
          keywords: ['numbered list', 'ordered list', 'ol'],
          nodeKlass: ListNode,
          onSelect: (_matchingString) =>
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
        }),
        new TypeaheadOption('Bulleted List', {
          icon: <i className="icon bullet" />,
          keywords: ['bulleted list', 'unordered list', 'ul'],
          nodeKlass: ListNode,
          onSelect: (_matchingString) =>
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
        }),
        new TypeaheadOption('Check List', {
          icon: <i className="icon check" />,
          keywords: ['check list', 'todo list'],
          nodeKlass: ListNode,
          onSelect: (_matchingString) =>
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
        }),
        new TypeaheadOption('Quote', {
          icon: <i className="icon quote" />,
          keywords: ['block quote'],
          nodeKlass: QuoteNode,
          onSelect: (_matchingString) =>
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $wrapLeafNodesInElements(selection, () => $createQuoteNode());
              }
            }),
        }),
        new TypeaheadOption('Code', {
          icon: <i className="icon code" />,
          keywords: ['javascript', 'python', 'js', 'codeblock'],
          nodeKlass: CodeNode,
          onSelect: (_matchingString) =>
            editor.update(() => {
              const selection = $getSelection();

              if ($isRangeSelection(selection)) {
                if (selection.isCollapsed()) {
                  $wrapLeafNodesInElements(selection, () => $createCodeNode());
                } else {
                  const textContent = selection.getTextContent();
                  const codeNode = $createCodeNode();
                  selection.insertNodes([codeNode]);
                  selection.insertRawText(textContent);
                }
              }
            }),
        }),
        new TypeaheadOption('Divider', {
          icon: <i className="icon horizontal-rule" />,
          keywords: ['horizantal rule', 'divider', 'hr'],
          nodeKlass: HorizontalRuleNode,
          onSelect: (_matchingString) =>
            editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
        }),

        new TypeaheadOption('Excalidraw', {
          icon: <i className="icon diagram-2" />,
          keywords: ['excalidraw', 'diagram', 'drawing'],
          nodeKlass: ExcalidrawNode,
          onSelect: (_matchingString) =>
            editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined),
        }),
        new TypeaheadOption('Poll', {
          icon: <i className="icon poll" />,
          keywords: ['poll', 'vote'],
          nodeKlass: PollNode,
          onSelect: (_matchingString) =>
            showModal('Insert Poll', (onClose) => (
              <InsertPollDialog activeEditor={editor} onClose={onClose} />
            )),
        }),
        new TypeaheadOption('Tweet', {
          icon: <i className="icon tweet" />,
          keywords: ['twitter', 'embed', 'tweet'],
          nodeKlass: TweetNode,
          onSelect: (_matchingString) =>
            showModal('Insert Tweet', (onClose) => (
              <InsertTweetDialog activeEditor={editor} onClose={onClose} />
            )),
        }),
        new TypeaheadOption('Equation', {
          icon: <i className="icon equation" />,
          keywords: ['equation', 'latex', 'math'],
          nodeKlass: EquationNode,
          onSelect: (_matchingString) =>
            showModal('Insert Equation', (onClose) => (
              <InsertEquationDialog activeEditor={editor} onClose={onClose} />
            )),
        }),
        new TypeaheadOption('GIF', {
          icon: <i className="icon gif" />,
          keywords: ['gif', 'animate', 'image', 'file'],
          nodeKlass: ImageNode,
          onSelect: (_matchingString) =>
            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
              altText: 'Cat typing on a laptop',
              src: catTypingGif,
            }),
        }),
        new TypeaheadOption('Image', {
          icon: <i className="icon image" />,
          keywords: ['image', 'photo', 'picture', 'file'],
          nodeKlass: ImageNode,
          onSelect: (_matchingString) =>
            showModal('Insert Image', (onClose) => (
              <InsertImageDialog activeEditor={editor} onClose={onClose} />
            )),
        }),
        ...['left', 'center', 'right', 'justify'].map(
          (alignment) =>
            new TypeaheadOption(`Align ${alignment}`, {
              icon: <i className={`icon ${alignment}-align`} />,
              keywords: ['align', 'justify', alignment],
              nodeKlass: ImageNode,
              onSelect: (_matchingString) =>
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
            }),
        ),
      ];

      const dynamicOptions = getDynamicOptions(matchingString);

      return matchingString
        ? [
            ...dynamicOptions,
            ...options.filter((option) => option.isMatch(matchingString)),
          ]
        : options;
    },
    [editor, getDynamicOptions, showModal],
  );

  return (
    <>
      {modal}
      <LexicalSlashShortcutMenuPlugin
        getOptions={getOptions}
        menuRenderFn={(
          anchorElement,
          options,
          {isSelected, applyCurrentSelected, setSelectedIndex},
        ) =>
          anchorElement
            ? ReactDOM.createPortal(
                <ul>
                  {options.map((result, i: number) => (
                    <ShortcutTypeaheadItem
                      index={i}
                      isSelected={isSelected(i)}
                      onClick={() => {
                        setSelectedIndex(i);
                        applyCurrentSelected();
                      }}
                      onMouseEnter={() => {
                        setSelectedIndex(i);
                      }}
                      key={result.title}
                      result={result}
                    />
                  ))}
                </ul>,
                anchorElement,
              )
            : null
        }
      />
    </>
  );
}
