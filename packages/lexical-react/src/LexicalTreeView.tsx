/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  //EditorConfig,
  EditorState,
  //ElementNode,
  GridSelection,
  LexicalEditor,
  LexicalNode,
  //NodeKey,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {$isLinkNode, LinkNode} from '@lexical/link';
//import {$isMarkNode} from '@lexical/mark';
import {mergeRegister} from '@lexical/utils';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  DEPRECATED_$isGridSelection,
} from 'lexical';
//import { relative } from 'node:path/win32';
//import { isRedo } from 'packages/lexical/src/LexicalUtils';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
//import { render } from 'react-dom';

const MAGIC_NUMBER1 = 500000;

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

type TreeViewDataNode = {
  line: string;
  selLine: string;
  children: Array<TreeViewDataNode>;
  isSelected: boolean;
};

const indentingStyle = {
  marginLeft: '1ch',
  marginRight: '1ch',
};
const spaceStyle = {
  marginLeft: '1ch',
};

function TreeViewNode({
  data,
  indent,
  isLastChild,
  isRoot,
  isVisible,
}: {
  data: TreeViewDataNode;
  indent: Array<string>; //array of symbols
  isLastChild: boolean;
  isRoot: boolean;
  isVisible: boolean;
}): JSX.Element {
  const [visible, set_visible] = useState<boolean>(isVisible);

  const l_indent = [...indent];
  const c_indent = [...indent];
  const s_indent = [...indent];
  if (!isRoot) {
    if (isLastChild) {
      l_indent.push(SYMBOLS.isLastChild);
      c_indent.push(SYMBOLS.ancestorIsLastChild);
      s_indent.push(SYMBOLS.ancestorIsLastChild);
    } else {
      l_indent.push(SYMBOLS.hasNextSibling);
      c_indent.push(SYMBOLS.ancestorHasNextSibling);
      s_indent.push(SYMBOLS.ancestorHasNextSibling);
    }
  }

  const indenting = (
    <>
      {l_indent.map((x, i) => {
        return (
          <span key={i} style={indentingStyle}>
            {x}
          </span>
        );
      })}
    </>
  );

  function get_spaces(sel: string): [Array<string>, string] {
    if (!sel) return [[], sel];
    const res: Array<string> = Array(0);
    let i = 0;
    for (i = 0; i < sel.length; i++) {
      if (sel[i] !== '_') break;
      res.push('');
    }
    const text = sel.substring(i);
    return [res, text];
  }

  const [spaces, sel] = get_spaces(data.selLine);

  const selected_indenting = (
    <>
      {s_indent.map((x, i) => {
        return (
          <span key={i} style={indentingStyle}>
            {x}
          </span>
        );
      })}
    </>
  );
  const selected_indenting2 = (
    <>
      {spaces.map((x, i) => {
        return (
          <span key={i} style={spaceStyle}>
            {x}
          </span>
        );
      })}
    </>
  );

  function toggleTree() {
    set_visible(!visible);
  }

  const toggleButtonStyle = {
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, mono',
    marginRight: '1ch',
  };

  let buttonAction = '+';
  let children = <></>;
  if (visible) {
    buttonAction = '-';
    children = (
      <>
        {data.children.map((child: TreeViewDataNode, i: number) => (
          <TreeViewNode
            isRoot={false}
            isVisible={true}
            isLastChild={i === data.children.length - 1}
            key={child.line}
            data={child}
            indent={c_indent}
          />
        ))}
      </>
    );
  }

  let togglebutton = (
    <span
      role="button"
      tabIndex={0}
      style={toggleButtonStyle}
      onClick={toggleTree}>
      [{buttonAction}]
    </span>
  );
  if (data.children.length === 0) {
    togglebutton = <></>;
  }

  let selected = ' ';
  let selectedLine = <></>;
  if (data.isSelected) {
    selected = SYMBOLS.selectedLine;
    selectedLine = (
      <tr>
        <td> </td>
        <td> </td>
        <td>
          {selected_indenting}
          {selected_indenting2}
          {sel}
        </td>
      </tr>
    );
  }
  return (
    <>
      <tr>
        <td>{selected}</td>
        <td>{togglebutton}</td>
        <td>
          {indenting}
          {data.line}
        </td>
      </tr>
      {selectedLine}
      {children}
    </>
  );
}

type TreeViewContentState = {
  rootdata: TreeViewDataNode;
  selectionString: string;
};

function TreeViewContent({
  editor,
  rendercnt,
}: {
  editor: LexicalEditor;
  rendercnt: number;
}): JSX.Element {
  const [state, setState] = useState<TreeViewContentState>({
    rootdata: {children: [], isSelected: false, line: '', selLine: ''},
    selectionString: '',
  });

  const editorState = editor.getEditorState();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function get_node_children(
    node: LexicalNode,
    selection: any,
  ): Array<TreeViewDataNode> {
    let childNodes = [];
    if (node && node.getChildren) {
      childNodes = node.getChildren();
    }
    const res: Array<TreeViewDataNode> = [];
    childNodes.forEach((childNode: LexicalNode) => {
      const nodeKey = childNode.getKey();
      const nodeKeyDisplay = `(${nodeKey})`;
      const typeDisplay = childNode.getType() || '';
      const isSelected = childNode.isSelected();
      //const idsDisplay = $isMarkNode(childNode);

      const indent = Array<string>(0);
      const sel = printSelectedCharsLine({
        indent: indent,
        isSelected: isSelected,
        node: childNode,
        nodeKeyDisplay: nodeKeyDisplay,
        selection: selection,
        typeDisplay: typeDisplay,
      });

      const line = `${nodeKeyDisplay} ${typeDisplay} ${printNode(childNode)}`;

      res.push({
        children: get_node_children(childNode, selection),
        isSelected: isSelected,
        line: line,
        selLine: sel,
      });
    });
    return res;
  }

  useEffect(() => {
    editorState.read(() => {
      const selection = $getSelection();
      const selectionString =
        selection === null
          ? ': null'
          : $isRangeSelection(selection)
          ? printRangeSelection(selection)
          : DEPRECATED_$isGridSelection(selection)
          ? printGridSelection(selection)
          : printObjectSelection(selection);
      const root = $getRoot();
      if (root != null) {
        //const nodeKey = root.getKey();
        //const nodeKeyDisplay = `(${nodeKey})`;
        //const typeDisplay = root.getType() || '';
        const isSelected = root.isSelected();
        //const idsDisplay = $isMarkNode(root)

        const line = 'root';

        const children: Array<TreeViewDataNode> = get_node_children(
          root,
          selection,
        );
        const rootdata: TreeViewDataNode = {
          children: children,
          isSelected: isSelected,
          line: line,
          selLine: '',
        };

        setState({rootdata: rootdata, selectionString: selectionString});
      }
    });
  }, [editorState, get_node_children, rendercnt]);

  const config = editor._config;
  const compositionKey = editor._compositionKey;
  const editable = editor._editable;

  let tree = <></>;
  if (state.selectionString !== '') {
    tree = (
      <TreeViewNode
        isRoot={true}
        isLastChild={true}
        isVisible={true}
        data={state.rootdata}
        indent={[]}
      />
    );
  }

  const emulatedPreStyle: Record<string, unknown> = {
    height: '180px', //
    left: '0px',
    lineHeight: '1.1',
    marginBottom: '0px',
    overflowY: 'auto',
    position: 'relative',
    right: '0px',
  };

  let compositionLine = <></>;
  if (compositionKey != null)
    compositionLine = <div>&nbsp;&nbsp;└ compositionKey {compositionKey}</div>;

  return (
    <>
      <div className="htmlpre" style={emulatedPreStyle}>
        <table cellPadding={0} cellSpacing={0} className={'treetable'}>
          <tbody>{tree}</tbody>
        </table>

        <pre> selection {state.selectionString}</pre>
        <div>editor:</div>
        <div>&nbsp;&nbsp;└ namespace {config.namespace}</div>
        {compositionLine}
        <div>&nbsp;&nbsp;└ editable {String(editable)}</div>
      </div>
    </>
  );
}

export function TreeView({
  timeTravelButtonClassName,
  timeTravelPanelSliderClassName,
  timeTravelPanelButtonClassName,
  viewClassName,
  timeTravelPanelClassName,
  editor,
}: {
  editor: LexicalEditor;
  timeTravelButtonClassName: string;
  timeTravelPanelButtonClassName: string;
  timeTravelPanelClassName: string;
  timeTravelPanelSliderClassName: string;
  viewClassName: string;
}): JSX.Element {
  const [timeStampedEditorStates, setTimeStampedEditorStates] = useState<
    Array<[number, EditorState]>
  >([]);

  const [timeTravelEnabled, setTimeTravelEnabled] = useState(false);
  const playingIndexRef = useRef(0);
  const treeElementRef = useRef<HTMLPreElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [rendercnt, set_rendercnt] = useState<number>(0);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        //this could fail once every 500000 times...
        set_rendercnt(Math.random() % MAGIC_NUMBER1);

        if (!timeTravelEnabled) {
          setTimeStampedEditorStates((currentEditorStates) => [
            ...currentEditorStates,
            [Date.now(), editorState],
          ]);
        }
      }),
      editor.registerEditableListener(() => {
        set_rendercnt(Math.random() % MAGIC_NUMBER1);
      }),
    );
  }, [timeTravelEnabled, editor]);

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
      {!timeTravelEnabled && totalEditorStates > 2 && (
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
      <TreeViewContent editor={editor} rendercnt={rendercnt} />
      {timeTravelEnabled && (
        <div className={timeTravelPanelClassName}>
          <button
            className={timeTravelPanelButtonClassName}
            onClick={() => {
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

function printRangeSelection(selection: RangeSelection): string {
  let res = '';

  const formatText = printFormatProperties(selection);

  res += `: range ${formatText !== '' ? `{ ${formatText} }` : ''}`;

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

function printObjectSelection(selection: NodeSelection): string {
  return `: node\n  └ [${Array.from(selection._nodes).join(', ')}]`;
}

function printGridSelection(selection: GridSelection): string {
  return `: grid\n  └ { grid: ${selection.gridKey}, anchorCell: ${selection.anchor.key}, focusCell: ${selection.focus.key} }`;
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
  (node: LexicalNode | RangeSelection) => node.hasFormat('bold') && 'Bold',
  (node: LexicalNode | RangeSelection) => node.hasFormat('code') && 'Code',
  (node: LexicalNode | RangeSelection) => node.hasFormat('italic') && 'Italic',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('strikethrough') && 'Strikethrough',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('subscript') && 'Subscript',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('superscript') && 'Superscript',
  (node: LexicalNode | RangeSelection) =>
    node.hasFormat('underline') && 'Underline',
];

const DETAIL_PREDICATES = [
  (node: LexicalNode) => node.isDirectionless() && 'Directionless',
  (node: LexicalNode) => node.isUnmergeable() && 'Unmergeable',
];

const MODE_PREDICATES = [
  (node: LexicalNode) => node.isToken() && 'Token',
  (node: LexicalNode) => node.isSegmented() && 'Segmented',
];

function printAllTextNodeProperties(node: LexicalNode) {
  return [
    printFormatProperties(node),
    printDetailProperties(node),
    printModeProperties(node),
  ]
    .filter(Boolean)
    .join(', ');
}

function printAllLinkNodeProperties(node: LinkNode) {
  return [printTargetProperties(node), printRelProperties(node)]
    .filter(Boolean)
    .join(', ');
}

function printDetailProperties(nodeOrSelection: LexicalNode) {
  let str = DETAIL_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'detail: ' + str;
  }

  return str;
}

function printModeProperties(nodeOrSelection: LexicalNode) {
  let str = MODE_PREDICATES.map((predicate) => predicate(nodeOrSelection))
    .filter(Boolean)
    .join(', ')
    .toLocaleLowerCase();

  if (str !== '') {
    str = 'mode: ' + str;
  }

  return str;
}

function printFormatProperties(nodeOrSelection: LexicalNode | RangeSelection) {
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
  selection: GridSelection | NodeSelection | RangeSelection | null;
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

  const unselectedChars = Array(start + 1).fill('_');
  const selectedChars = Array(end - start).fill(SYMBOLS.selectedChar);
  const paddingLength = typeDisplay.length + 2; // 2 for the spaces around + 1 for the double quote.

  const nodePrintSpaces = Array(nodeKeyDisplay.length + paddingLength).fill(
    '_',
  );

  return [...nodePrintSpaces, ...unselectedChars, ...selectedChars].join('');
}

function $getSelectionStartEnd(
  node: LexicalNode,
  selection: RangeSelection | GridSelection,
): [number, number] {
  const anchor = selection.anchor;
  const focus = selection.focus;
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
