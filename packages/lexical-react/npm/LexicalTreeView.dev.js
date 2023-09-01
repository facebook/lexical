/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var html = require('@lexical/html');
var link = require('@lexical/link');
var mark = require('@lexical/mark');
var utils = require('@lexical/utils');
var lexical = require('lexical');
var React = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const NON_SINGLE_WIDTH_CHARS_REPLACEMENT = Object.freeze({
  '\t': '\\t',
  '\n': '\\n'
});
const NON_SINGLE_WIDTH_CHARS_REGEX = new RegExp(Object.keys(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).join('|'), 'g');
const SYMBOLS = Object.freeze({
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
  hasNextSibling: '├',
  isLastChild: '└',
  selectedChar: '^',
  selectedLine: '>'
});
function TreeView({
  treeTypeButtonClassName,
  timeTravelButtonClassName,
  timeTravelPanelSliderClassName,
  timeTravelPanelButtonClassName,
  viewClassName,
  timeTravelPanelClassName,
  editor
}) {
  const [timeStampedEditorStates, setTimeStampedEditorStates] = React.useState([]);
  const [content, setContent] = React.useState('');
  const [timeTravelEnabled, setTimeTravelEnabled] = React.useState(false);
  const [showExportDOM, setShowExportDOM] = React.useState(false);
  const playingIndexRef = React.useRef(0);
  const treeElementRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLimited, setIsLimited] = React.useState(false);
  const [showLimited, setShowLimited] = React.useState(false);
  const lastEditorStateRef = React.useRef(null);
  const commandsLog = useLexicalCommandsLog(editor);
  const generateTree = React.useCallback(editorState => {
    const treeText = generateContent(editor, commandsLog, showExportDOM);
    setContent(treeText);
    if (!timeTravelEnabled) {
      setTimeStampedEditorStates(currentEditorStates => [...currentEditorStates, [Date.now(), editorState]]);
    }
  }, [commandsLog, editor, timeTravelEnabled, showExportDOM]);
  React.useEffect(() => {
    const editorState = editor.getEditorState();
    if (!showLimited && editorState._nodeMap.size < 1000) {
      setContent(generateContent(editor, commandsLog, showExportDOM));
    }
  }, [commandsLog, editor, showLimited, showExportDOM]);
  React.useEffect(() => {
    return utils.mergeRegister(editor.registerUpdateListener(({
      editorState
    }) => {
      if (!showLimited && editorState._nodeMap.size > 1000) {
        lastEditorStateRef.current = editorState;
        setIsLimited(true);
        if (!showLimited) {
          return;
        }
      }
      generateTree(editorState);
    }), editor.registerEditableListener(() => {
      const treeText = generateContent(editor, commandsLog, showExportDOM);
      setContent(treeText);
    }));
  }, [commandsLog, editor, showExportDOM, isLimited, generateTree, showLimited]);
  const totalEditorStates = timeStampedEditorStates.length;
  React.useEffect(() => {
    if (isPlaying) {
      let timeoutId;
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
  React.useEffect(() => {
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
  return /*#__PURE__*/React.createElement("div", {
    className: viewClassName
  }, !showLimited && isLimited ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginRight: 20
    }
  }, "Detected large EditorState, this can impact debugging performance."), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowLimited(true);
      const editorState = lastEditorStateRef.current;
      if (editorState !== null) {
        lastEditorStateRef.current = null;
        generateTree(editorState);
      }
    },
    style: {
      background: 'transparent',
      border: '1px solid white',
      color: 'white',
      cursor: 'pointer',
      padding: 5
    }
  }, "Show full tree")) : null, !showLimited ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowExportDOM(!showExportDOM),
    className: treeTypeButtonClassName,
    type: "button"
  }, showExportDOM ? 'Tree' : 'Export DOM') : null, !timeTravelEnabled && (showLimited || !isLimited) && totalEditorStates > 2 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const rootElement = editor.getRootElement();
      if (rootElement !== null) {
        rootElement.contentEditable = 'false';
        playingIndexRef.current = totalEditorStates - 1;
        setTimeTravelEnabled(true);
      }
    },
    className: timeTravelButtonClassName,
    type: "button"
  }, "Time Travel"), (showLimited || !isLimited) && /*#__PURE__*/React.createElement("pre", {
    ref: treeElementRef
  }, content), timeTravelEnabled && (showLimited || !isLimited) && /*#__PURE__*/React.createElement("div", {
    className: timeTravelPanelClassName
  }, /*#__PURE__*/React.createElement("button", {
    className: timeTravelPanelButtonClassName,
    onClick: () => {
      if (playingIndexRef.current === totalEditorStates - 1) {
        playingIndexRef.current = 1;
      }
      setIsPlaying(!isPlaying);
    },
    type: "button"
  }, isPlaying ? 'Pause' : 'Play'), /*#__PURE__*/React.createElement("input", {
    className: timeTravelPanelSliderClassName,
    ref: inputRef,
    onChange: event => {
      const editorStateIndex = Number(event.target.value);
      const timeStampedEditorState = timeStampedEditorStates[editorStateIndex];
      if (timeStampedEditorState) {
        playingIndexRef.current = editorStateIndex;
        editor.setEditorState(timeStampedEditorState[1]);
      }
    },
    type: "range",
    min: "1",
    max: totalEditorStates - 1
  }), /*#__PURE__*/React.createElement("button", {
    className: timeTravelPanelButtonClassName,
    onClick: () => {
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
    },
    type: "button"
  }, "Exit")));
}
function useLexicalCommandsLog(editor) {
  const [loggedCommands, setLoggedCommands] = React.useState([]);
  React.useEffect(() => {
    const unregisterCommandListeners = new Set();
    for (const [command] of editor._commands) {
      unregisterCommandListeners.add(editor.registerCommand(command, payload => {
        setLoggedCommands(state => {
          const newState = [...state];
          newState.push({
            payload,
            type: command.type ? command.type : 'UNKNOWN'
          });
          if (newState.length > 10) {
            newState.shift();
          }
          return newState;
        });
        return false;
      }, lexical.COMMAND_PRIORITY_HIGH));
    }
    return () => unregisterCommandListeners.forEach(unregister => unregister());
  }, [editor]);
  return React.useMemo(() => loggedCommands, [loggedCommands]);
}
function printRangeSelection(selection) {
  let res = '';
  const formatText = printFormatProperties(selection);
  res += `: range ${formatText !== '' ? `{ ${formatText} }` : ''} ${selection.style !== '' ? `{ style: ${selection.style} } ` : ''}`;
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  res += `\n  ├ anchor { key: ${anchor.key}, offset: ${anchorOffset === null ? 'null' : anchorOffset}, type: ${anchor.type} }`;
  res += `\n  └ focus { key: ${focus.key}, offset: ${focusOffset === null ? 'null' : focusOffset}, type: ${focus.type} }`;
  return res;
}
function printNodeSelection(selection) {
  return `: node\n  └ [${Array.from(selection._nodes).join(', ')}]`;
}
function printGridSelection(selection) {
  return `: grid\n  └ { grid: ${selection.gridKey}, anchorCell: ${selection.anchor.key}, focusCell: ${selection.focus.key} }`;
}
function generateContent(editor, commandsLog, exportDOM) {
  const editorState = editor.getEditorState();
  const editorConfig = editor._config;
  const compositionKey = editor._compositionKey;
  const editable = editor._editable;
  if (exportDOM) {
    let htmlString = '';
    editorState.read(() => {
      htmlString = printPrettyHTML(html.$generateHtmlFromNodes(editor));
    });
    return htmlString;
  }
  let res = ' root\n';
  const selectionString = editorState.read(() => {
    const selection = lexical.$getSelection();
    visitTree(lexical.$getRoot(), (node, indent) => {
      const nodeKey = node.getKey();
      const nodeKeyDisplay = `(${nodeKey})`;
      const typeDisplay = node.getType() || '';
      const isSelected = node.isSelected();
      const idsDisplay = mark.$isMarkNode(node) ? ` id: [ ${node.getIDs().join(', ')} ] ` : '';
      res += `${isSelected ? SYMBOLS.selectedLine : ' '} ${indent.join(' ')} ${nodeKeyDisplay} ${typeDisplay} ${idsDisplay} ${printNode(node)}\n`;
      res += printSelectedCharsLine({
        indent,
        isSelected,
        node,
        nodeKeyDisplay,
        selection,
        typeDisplay
      });
    });
    return selection === null ? ': null' : lexical.$isRangeSelection(selection) ? printRangeSelection(selection) : lexical.DEPRECATED_$isGridSelection(selection) ? printGridSelection(selection) : printNodeSelection(selection);
  });
  res += '\n selection' + selectionString;
  res += '\n\n commands:';
  if (commandsLog.length) {
    for (const {
      type,
      payload
    } of commandsLog) {
      res += `\n  └ { type: ${type}, payload: ${payload instanceof Event ? payload.constructor.name : payload} }`;
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
function visitTree(currentNode, visitor, indent = []) {
  const childNodes = currentNode.getChildren();
  const childNodesLength = childNodes.length;
  childNodes.forEach((childNode, i) => {
    visitor(childNode, indent.concat(i === childNodesLength - 1 ? SYMBOLS.isLastChild : SYMBOLS.hasNextSibling));
    if (lexical.$isElementNode(childNode)) {
      visitTree(childNode, visitor, indent.concat(i === childNodesLength - 1 ? SYMBOLS.ancestorIsLastChild : SYMBOLS.ancestorHasNextSibling));
    }
  });
}
function normalize(text) {
  return Object.entries(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).reduce((acc, [key, value]) => acc.replace(new RegExp(key, 'g'), String(value)), text);
}

// TODO Pass via props to allow customizability
function printNode(node) {
  if (lexical.$isTextNode(node)) {
    const text = node.getTextContent();
    const title = text.length === 0 ? '(empty)' : `"${normalize(text)}"`;
    const properties = printAllTextNodeProperties(node);
    return [title, properties.length !== 0 ? `{ ${properties} }` : null].filter(Boolean).join(' ').trim();
  } else if (link.$isLinkNode(node)) {
    const link = node.getURL();
    const title = link.length === 0 ? '(empty)' : `"${normalize(link)}"`;
    const properties = printAllLinkNodeProperties(node);
    return [title, properties.length !== 0 ? `{ ${properties} }` : null].filter(Boolean).join(' ').trim();
  } else {
    return '';
  }
}
const FORMAT_PREDICATES = [node => node.hasFormat('bold') && 'Bold', node => node.hasFormat('code') && 'Code', node => node.hasFormat('italic') && 'Italic', node => node.hasFormat('strikethrough') && 'Strikethrough', node => node.hasFormat('subscript') && 'Subscript', node => node.hasFormat('superscript') && 'Superscript', node => node.hasFormat('underline') && 'Underline'];
const DETAIL_PREDICATES = [node => node.isDirectionless() && 'Directionless', node => node.isUnmergeable() && 'Unmergeable'];
const MODE_PREDICATES = [node => node.isToken() && 'Token', node => node.isSegmented() && 'Segmented'];
function printAllTextNodeProperties(node) {
  return [printFormatProperties(node), printDetailProperties(node), printModeProperties(node)].filter(Boolean).join(', ');
}
function printAllLinkNodeProperties(node) {
  return [printTargetProperties(node), printRelProperties(node), printTitleProperties(node)].filter(Boolean).join(', ');
}
function printDetailProperties(nodeOrSelection) {
  let str = DETAIL_PREDICATES.map(predicate => predicate(nodeOrSelection)).filter(Boolean).join(', ').toLocaleLowerCase();
  if (str !== '') {
    str = 'detail: ' + str;
  }
  return str;
}
function printModeProperties(nodeOrSelection) {
  let str = MODE_PREDICATES.map(predicate => predicate(nodeOrSelection)).filter(Boolean).join(', ').toLocaleLowerCase();
  if (str !== '') {
    str = 'mode: ' + str;
  }
  return str;
}
function printFormatProperties(nodeOrSelection) {
  let str = FORMAT_PREDICATES.map(predicate => predicate(nodeOrSelection)).filter(Boolean).join(', ').toLocaleLowerCase();
  if (str !== '') {
    str = 'format: ' + str;
  }
  return str;
}
function printTargetProperties(node) {
  let str = node.getTarget();
  // TODO Fix nullish on LinkNode
  if (str != null) {
    str = 'target: ' + str;
  }
  return str;
}
function printRelProperties(node) {
  let str = node.getRel();
  // TODO Fix nullish on LinkNode
  if (str != null) {
    str = 'rel: ' + str;
  }
  return str;
}
function printTitleProperties(node) {
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
  typeDisplay
}) {
  // No selection or node is not selected.
  if (!lexical.$isTextNode(node) || !lexical.$isRangeSelection(selection) || !isSelected || lexical.$isElementNode(node)) {
    return '';
  }

  // No selected characters.
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (node.getTextContent() === '' || anchor.getNode() === selection.focus.getNode() && anchor.offset === focus.offset) {
    return '';
  }
  const [start, end] = $getSelectionStartEnd(node, selection);
  if (start === end) {
    return '';
  }
  const selectionLastIndent = indent[indent.length - 1] === SYMBOLS.hasNextSibling ? SYMBOLS.ancestorHasNextSibling : SYMBOLS.ancestorIsLastChild;
  const indentionChars = [...indent.slice(0, indent.length - 1), selectionLastIndent];
  const unselectedChars = Array(start + 1).fill(' ');
  const selectedChars = Array(end - start).fill(SYMBOLS.selectedChar);
  const paddingLength = typeDisplay.length + 3; // 2 for the spaces around + 1 for the double quote.

  const nodePrintSpaces = Array(nodeKeyDisplay.length + paddingLength).fill(' ');
  return [SYMBOLS.selectedLine, indentionChars.join(' '), [...nodePrintSpaces, ...unselectedChars, ...selectedChars].join('')].join(' ') + '\n';
}
function printPrettyHTML(str) {
  const div = document.createElement('div');
  div.innerHTML = str.trim();
  return prettifyHTML(div, 0).innerHTML;
}
function prettifyHTML(node, level) {
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
function $getSelectionStartEnd(node, selection) {
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
    if (anchorNode === focusNode && node === anchorNode && anchor.offset !== focus.offset) {
      [start, end] = anchor.offset < focus.offset ? [anchor.offset, focus.offset] : [focus.offset, anchor.offset];
    } else if (node === anchorNode) {
      [start, end] = anchorNode.isBefore(focusNode) ? [anchor.offset, textLength] : [0, anchor.offset];
    } else if (node === focusNode) {
      [start, end] = focusNode.isBefore(anchorNode) ? [focus.offset, textLength] : [0, focus.offset];
    } else {
      // Node is within selection but not the anchor nor focus.
      [start, end] = [0, textLength];
    }
  }

  // Account for non-single width characters.
  const numNonSingleWidthCharBeforeSelection = (textContent.slice(0, start).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []).length;
  const numNonSingleWidthCharInSelection = (textContent.slice(start, end).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []).length;
  return [start + numNonSingleWidthCharBeforeSelection, end + numNonSingleWidthCharBeforeSelection + numNonSingleWidthCharInSelection];
}

exports.TreeView = TreeView;
