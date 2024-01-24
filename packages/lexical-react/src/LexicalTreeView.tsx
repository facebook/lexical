/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseSelection,
  EditorState,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  TextNode,
} from 'lexical';

import {$generateHtmlFromNodes} from '@lexical/html';
import {$isLinkNode, LinkNode} from '@lexical/link';
import {$isMarkNode} from '@lexical/mark';
import {$isTableSelection, TableSelection} from '@lexical/table';
import {mergeRegister} from '@lexical/utils';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  LexicalCommand,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

const NON_SINGLE_WIDTH_CHARS_REPLACEMENT: Readonly<Record<string, string>> =
  Object.freeze({
    '\t': '\\t',
    '\n': '\\n',
  });
const NON_SINGLE_WIDTH_CHARS_REGEX = new RegExp(
  Object.keys(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).join('|'),
  'g',
);
const SYMBOLS: Record<string, string> = Object.freeze({
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
  hasNextSibling: '├',
  isLastChild: '└',
  selectedChar: '^',
  selectedLine: '>',
});

export function TreeView({
  treeTypeButtonClassName,
  timeTravelButtonClassName,
  timeTravelPanelSliderClassName,
  timeTravelPanelButtonClassName,
  viewClassName,
  timeTravelPanelClassName,
  editor,
}: {
  editor: LexicalEditor;
  treeTypeButtonClassName: string;
  timeTravelButtonClassName: string;
  timeTravelPanelButtonClassName: string;
  timeTravelPanelClassName: string;
  timeTravelPanelSliderClassName: string;
  viewClassName: string;
}): JSX.Element {
  const [timeStampedEditorStates, setTimeStampedEditorStates] = useState<
    Array<[number, EditorState]>
  >([]);
  const [content, setContent] = useState<string>('');
  const [timeTravelEnabled, setTimeTravelEnabled] = useState(false);
  const [showExportDOM, setShowExportDOM] = useState(false);
  const playingIndexRef = useRef(0);
  const treeElementRef = useRef<HTMLPreElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [showLimited, setShowLimited] = useState(false);
  const lastEditorStateRef = useRef<null | EditorState>(null);

  const commandsLog = useLexicalCommandsLog(editor);

  const generateTree = useCallback(
    (editorState: EditorState) => {
      const treeText = generateContent(editor, commandsLog, showExportDOM);

      setContent(treeText);

      if (!timeTravelEnabled) {
        setTimeStampedEditorStates((currentEditorStates) => [
          ...currentEditorStates,
          [Date.now(), editorState],
        ]);
      }
    },
    [commandsLog, editor, timeTravelEnabled, showExportDOM],
  );

  useEffect(() => {
    const editorState = editor.getEditorState();

    if (!showLimited && editorState._nodeMap.size < 1000) {
      setContent(generateContent(editor, commandsLog, showExportDOM));
    }
  }, [commandsLog, editor, showLimited, showExportDOM]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        if (!showLimited && editorState._nodeMap.size > 1000) {
          lastEditorStateRef.current = editorState;
          setIsLimited(true);
          if (!showLimited) {
            return;
          }
        }
        generateTree(editorState);
      }),
      editor.registerEditableListener(() => {
        const treeText = generateContent(editor, commandsLog, showExportDOM);
        setContent(treeText);
      }),
    );
  }, [
    commandsLog,
    editor,
    showExportDOM,
    isLimited,
    generateTree,
    showLimited,
  ]);

  const totalEditorStates = timeStampedEditorStates.length;

  useEffect(() => {
    if (isPlaying) {
      let timeoutId: ReturnType<typeof setTimeout>;

      const play = () => {
        const currentIndex = playingIndexRef.current;

        if (currentIndex === totalEditorStates - 1) {
          setIsPlaying(false);
          return;
        }

        const currentTime = timeStampedEditorStates[currentIndex][0];
        const nextTime = timeStampedEditorStates[currentIndex + 1][0];
        const timeDiff = nextTime - currentTime;
        timeoutId = setTimeout(() => {
          playingIndexRef.current++;
          const index = playingIndexRef.current;
          const input = inputRef.current;

          if (input !== null) {
            input.value = String(index);
          }

          editor.setEditorState(timeStampedEditorStates[index][1]);
          play();
        }, timeDiff);
      };

      play();

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [timeStampedEditorStates, isPlaying, editor, totalEditorStates]);

  useEffect(() => {
    const element = treeElementRef.current;

    if (element !== null) {
      // @ts-ignore Internal field
      element.__lexicalEditor = editor;

      return () => {
        // @ts-ignore Internal field
        element.__lexicalEditor = null;
      };
    }
  }, [editor]);

  return (
    <div className={viewClassName}>
      {!showLimited && isLimited ? (
        <div style={{padding: 20}}>
          <span style={{marginRight: 20}}>
            Detected large EditorState, this can impact debugging performance.
          </span>
          <button
            onClick={() => {
              setShowLimited(true);
              const editorState = lastEditorStateRef.current;
              if (editorState !== null) {
                lastEditorStateRef.current = null;
                generateTree(editorState);
              }
            }}
            style={{
              background: 'transparent',
              border: '1px solid white',
              color: 'white',
              cursor: 'pointer',
              padding: 5,
            }}>
            Show full tree
          </button>
        </div>
      ) : null}
      {!showLimited ? (
        <button
          onClick={() => setShowExportDOM(!showExportDOM)}
          className={treeTypeButtonClassName}
          type="button">
          {showExportDOM ? 'Tree' : 'Export DOM'}
        </button>
      ) : null}
      {!timeTravelEnabled &&
        (showLimited || !isLimited) &&
        totalEditorStates > 2 && (
          <button
            onClick={() => {
              const rootElement = editor.getRootElement();

              if (rootElement !== null) {
                rootElement.contentEditable = 'false';
                playingIndexRef.current = totalEditorStates - 1;
                setTimeTravelEnabled(true);
              }
            }}
            className={timeTravelButtonClassName}
            type="button">
            Time Travel
          </button>
        )}
      {(showLimited || !isLimited) && <pre ref={treeElementRef}>{content}</pre>}
      {timeTravelEnabled && (showLimited || !isLimited) && (
        <div className={timeTravelPanelClassName}>
          <button
            className={timeTravelPanelButtonClassName}
            onClick={() => {
              if (playingIndexRef.current === totalEditorStates - 1) {
                playingIndexRef.current = 1;
              }
              setIsPlaying(!isPlaying);
            }}
            type="button">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <input
            className={timeTravelPanelSliderClassName}
            ref={inputRef}
            onChange={(event) => {
              const editorStateIndex = Number(event.target.value);
              const timeStampedEditorState =
                timeStampedEditorStates[editorStateIndex];

              if (timeStampedEditorState) {
                playingIndexRef.current = editorStateIndex;
                editor.setEditorState(timeStampedEditorState[1]);
              }
            }}
            type="range"
            min="1"
            max={totalEditorStates - 1}
          />
          <button
            className={timeTravelPanelButtonClassName}
            onClick={() => {
              const rootElement = editor.getRootElement();

              if (rootElement !== null) {
                rootElement.contentEditable = 'true';
                const index = timeStampedEditorStates.length - 1;
                const timeStampedEditorState = timeStampedEditorStates[index];
                editor.setEditorState(timeStampedEditorState[1]);
                const input = inputRef.current;

                if (input !== null) {
                  input.value = String(index);
                }

                setTimeTravelEnabled(false);
                setIsPlaying(false);
              }
            }}
            type="button">
            Exit
          </button>
        </div>
      )}
    </div>
  );
}

function useLexicalCommandsLog(
  editor: LexicalEditor,
): ReadonlyArray<LexicalCommand<unknown> & {payload: unknown}> {
  const [loggedCommands, setLoggedCommands] = useState<
    ReadonlyArray<LexicalCommand<unknown> & {payload: unknown}>
  >([]);

  useEffect(() => {
    const unregisterCommandListeners = new Set<() => void>();

    for (const [command] of editor._commands) {
      unregisterCommandListeners.add(
        editor.registerCommand(
          command,
          (payload) => {
            setLoggedCommands((state) => {
              const newState = [...state];
              newState.push({
                payload,
                type: command.type ? command.type : 'UNKNOWN',
              });

              if (newState.length > 10) {
                newState.shift();
              }

              return newState;
            });

            return false;
          },
          COMMAND_PRIORITY_HIGH,
        ),
      );
    }

    return () =>
      unregisterCommandListeners.forEach((unregister) => unregister());
  }, [editor]);

  return useMemo(() => loggedCommands, [loggedCommands]);
}

function printRangeSelection(selection: RangeSelection): string {
  let res = '';

  const formatText = printFormatProperties(selection);

  res += `: range ${formatText !== '' ? `{ ${formatText} }` : ''} ${
    selection.style !== '' ? `{ style: ${selection.style} } ` : ''
  }`;

  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;

  res += `\n  ├ anchor { key: ${anchor.key}, offset: ${
    anchorOffset === null ? 'null' : anchorOffset
  }, type: ${anchor.type} }`;
  res += `\n  └ focus { key: ${focus.key}, offset: ${
    focusOffset === null ? 'null' : focusOffset
  }, type: ${focus.type} }`;

  return res;
}

function printNodeSelection(selection: BaseSelection): string {
  if (!$isNodeSelection(selection)) return '';
  return `: node\n  └ [${Array.from(selection._nodes).join(', ')}]`;
}

function printTableSelection(selection: TableSelection): string {
  return `: table\n  └ { table: ${selection.tableKey}, anchorCell: ${selection.anchor.key}, focusCell: ${selection.focus.key} }`;
}

function generateContent(
  editor: LexicalEditor,
  commandsLog: ReadonlyArray<LexicalCommand<unknown> & {payload: unknown}>,
  exportDOM: boolean,
): string {
  const editorState = editor.getEditorState();
  const editorConfig = editor._config;
  const compositionKey = editor._compositionKey;
  const editable = editor._editable;

  if (exportDOM) {
    let htmlString = '';
    editorState.read(() => {
      htmlString = printPrettyHTML($generateHtmlFromNodes(editor));
    });
    return htmlString;
  }

  let res = ' root\n';

  const selectionString = editorState.read(() => {
    const selection = $getSelection();

    visitTree($getRoot(), (node: LexicalNode, indent: Array<string>) => {
      const nodeKey = node.getKey();
      const nodeKeyDisplay = `(${nodeKey})`;
      const typeDisplay = node.getType() || '';
      const isSelected = node.isSelected();
      const idsDisplay = $isMarkNode(node)
        ? ` id: [ ${node.getIDs().join(', ')} ] `
        : '';

      res += `${isSelected ? SYMBOLS.selectedLine : ' '} ${indent.join(
        ' ',
      )} ${nodeKeyDisplay} ${typeDisplay} ${idsDisplay} ${printNode(node)}\n`;

      res += printSelectedCharsLine({
        indent,
        isSelected,
        node,
        nodeKeyDisplay,
        selection,
        typeDisplay,
      });
    });

    return selection === null
      ? ': null'
      : $isRangeSelection(selection)
      ? printRangeSelection(selection)
      : $isTableSelection(selection)
      ? printTableSelection(selection)
      : printNodeSelection(selection);
  });

  res += '\n selection' + selectionString;

  res += '\n\n commands:';

  if (commandsLog.length) {
    for (const {type, payload} of commandsLog) {
      res += `\n  └ { type: ${type}, payload: ${
        payload instanceof Event ? payload.constructor.name : payload
      } }`;
    }
  } else {
    res += '\n  └ None dispatched.';
  }

  res += '\n\n editor:';
  res += `\n  └ namespace ${editorConfig.namespace}`;
  if (compositionKey !== null) {
    res += `\n  └ compositionKey ${compositionKey}`;
  }
  res += `\n  └ editable ${String(editable)}`;

  return res;
}

function visitTree(
  currentNode: ElementNode,
  visitor: (node: LexicalNode, indentArr: Array<string>) => void,
  indent: Array<string> = [],
) {
  const childNodes = currentNode.getChildren();
  const childNodesLength = childNodes.length;

  childNodes.forEach((childNode, i) => {
    visitor(
      childNode,
      indent.concat(
        i === childNodesLength - 1
          ? SYMBOLS.isLastChild
          : SYMBOLS.hasNextSibling,
      ),
    );

    if ($isElementNode(childNode)) {
      visitTree(
        childNode,
        visitor,
        indent.concat(
          i === childNodesLength - 1
            ? SYMBOLS.ancestorIsLastChild
            : SYMBOLS.ancestorHasNextSibling,
        ),
      );
    }
  });
}

function normalize(text: string) {
  return Object.entries(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(key, 'g'), String(value)),
    text,
  );
}

// TODO Pass via props to allow customizability
function printNode(node: LexicalNode) {
  if ($isTextNode(node)) {
    const text = node.getTextContent();
    const title = text.length === 0 ? '(empty)' : `"${normalize(text)}"`;
    const properties = printAllTextNodeProperties(node);
    return [title, properties.length !== 0 ? `{ ${properties} }` : null]
      .filter(Boolean)
      .join(' ')
      .trim();
  } else if ($isLinkNode(node)) {
    const link = node.getURL();
    const title = link.length === 0 ? '(empty)' : `"${normalize(link)}"`;
    const properties = printAllLinkNodeProperties(node);
    return [title, properties.length !== 0 ? `{ ${properties} }` : null]
      .filter(Boolean)
      .join(' ')
      .trim();
  } else {
    return '';
  }
}

const FORMAT_PREDICATES = [
  (node: TextNode | RangeSelection) => node.hasFormat('bold') && 'Bold',
  (node: TextNode | RangeSelection) => node.hasFormat('code') && 'Code',
  (node: TextNode | RangeSelection) => node.hasFormat('italic') && 'Italic',
  (node: TextNode | RangeSelection) =>
    node.hasFormat('strikethrough') && 'Strikethrough',
  (node: TextNode | RangeSelection) =>
    node.hasFormat('subscript') && 'Subscript',
  (node: TextNode | RangeSelection) =>
    node.hasFormat('superscript') && 'Superscript',
  (node: TextNode | RangeSelection) =>
    node.hasFormat('underline') && 'Underline',
];

const DETAIL_PREDICATES = [
  (node: TextNode) => node.isDirectionless() && 'Directionless',
  (node: TextNode) => node.isUnmergeable() && 'Unmergeable',
];

const MODE_PREDICATES = [
  (node: TextNode) => node.isToken() && 'Token',
  (node: TextNode) => node.isSegmented() && 'Segmented',
];

function printAllTextNodeProperties(node: TextNode) {
  return [
    printFormatProperties(node),
    printDetailProperties(node),
    printModeProperties(node),
  ]
    .filter(Boolean)
    .join(', ');
}

function printAllLinkNodeProperties(node: LinkNode) {
  return [
    printTargetProperties(node),
    printRelProperties(node),
    printTitleProperties(node),
  ]
    .filter(Boolean)
    .join(', ');
}

function printDetailProperties(nodeOrSelection: TextNode) {
  let str = DETAIL_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'detail: ' + str;
  }

  return str;
}

function printModeProperties(nodeOrSelection: TextNode) {
  let str = MODE_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'mode: ' + str;
  }

  return str;
}

function printFormatProperties(nodeOrSelection: TextNode | RangeSelection) {
  let str = FORMAT_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'format: ' + str;
  }

  return str;
}

function printTargetProperties(node: LinkNode) {
  let str = node.getTarget();
  // TODO Fix nullish on LinkNode
  if (str != null) {
    str = 'target: ' + str;
  }
  return str;
}

function printRelProperties(node: LinkNode) {
  let str = node.getRel();
  // TODO Fix nullish on LinkNode
  if (str != null) {
    str = 'rel: ' + str;
  }
  return str;
}

function printTitleProperties(node: LinkNode) {
  let str = node.getTitle();
  // TODO Fix nullish on LinkNode
  if (str != null) {
    str = 'title: ' + str;
  }
  return str;
}

function printSelectedCharsLine({
  indent,
  isSelected,
  node,
  nodeKeyDisplay,
  selection,
  typeDisplay,
}: {
  indent: Array<string>;
  isSelected: boolean;
  node: LexicalNode;
  nodeKeyDisplay: string;
  selection: BaseSelection | null;
  typeDisplay: string;
}) {
  // No selection or node is not selected.
  if (
    !$isTextNode(node) ||
    !$isRangeSelection(selection) ||
    !isSelected ||
    $isElementNode(node)
  ) {
    return '';
  }

  // No selected characters.
  const anchor = selection.anchor;
  const focus = selection.focus;

  if (
    node.getTextContent() === '' ||
    (anchor.getNode() === selection.focus.getNode() &&
      anchor.offset === focus.offset)
  ) {
    return '';
  }

  const [start, end] = $getSelectionStartEnd(node, selection);

  if (start === end) {
    return '';
  }

  const selectionLastIndent =
    indent[indent.length - 1] === SYMBOLS.hasNextSibling
      ? SYMBOLS.ancestorHasNextSibling
      : SYMBOLS.ancestorIsLastChild;

  const indentionChars = [
    ...indent.slice(0, indent.length - 1),
    selectionLastIndent,
  ];
  const unselectedChars = Array(start + 1).fill(' ');
  const selectedChars = Array(end - start).fill(SYMBOLS.selectedChar);
  const paddingLength = typeDisplay.length + 3; // 2 for the spaces around + 1 for the double quote.

  const nodePrintSpaces = Array(nodeKeyDisplay.length + paddingLength).fill(
    ' ',
  );

  return (
    [
      SYMBOLS.selectedLine,
      indentionChars.join(' '),
      [...nodePrintSpaces, ...unselectedChars, ...selectedChars].join(''),
    ].join(' ') + '\n'
  );
}

function printPrettyHTML(str: string) {
  const div = document.createElement('div');
  div.innerHTML = str.trim();
  return prettifyHTML(div, 0).innerHTML;
}

function prettifyHTML(node: Element, level: number) {
  const indentBefore = new Array(level++ + 1).join('  ');
  const indentAfter = new Array(level - 1).join('  ');
  let textNode;

  for (let i = 0; i < node.children.length; i++) {
    textNode = document.createTextNode('\n' + indentBefore);
    node.insertBefore(textNode, node.children[i]);
    prettifyHTML(node.children[i], level);
    if (node.lastElementChild === node.children[i]) {
      textNode = document.createTextNode('\n' + indentAfter);
      node.appendChild(textNode);
    }
  }

  return node;
}

function $getSelectionStartEnd(
  node: LexicalNode,
  selection: BaseSelection,
): [number, number] {
  const anchorAndFocus = selection.getStartEndPoints();
  if ($isNodeSelection(selection) || anchorAndFocus === null) {
    return [-1, -1];
  }
  const [anchor, focus] = anchorAndFocus;
  const textContent = node.getTextContent();
  const textLength = textContent.length;

  let start = -1;
  let end = -1;

  // Only one node is being selected.
  if (anchor.type === 'text' && focus.type === 'text') {
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();

    if (
      anchorNode === focusNode &&
      node === anchorNode &&
      anchor.offset !== focus.offset
    ) {
      [start, end] =
        anchor.offset < focus.offset
          ? [anchor.offset, focus.offset]
          : [focus.offset, anchor.offset];
    } else if (node === anchorNode) {
      [start, end] = anchorNode.isBefore(focusNode)
        ? [anchor.offset, textLength]
        : [0, anchor.offset];
    } else if (node === focusNode) {
      [start, end] = focusNode.isBefore(anchorNode)
        ? [focus.offset, textLength]
        : [0, focus.offset];
    } else {
      // Node is within selection but not the anchor nor focus.
      [start, end] = [0, textLength];
    }
  }

  // Account for non-single width characters.
  const numNonSingleWidthCharBeforeSelection = (
    textContent.slice(0, start).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []
  ).length;
  const numNonSingleWidthCharInSelection = (
    textContent.slice(start, end).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []
  ).length;

  return [
    start + numNonSingleWidthCharBeforeSelection,
    end +
      numNonSingleWidthCharBeforeSelection +
      numNonSingleWidthCharInSelection,
  ];
}
