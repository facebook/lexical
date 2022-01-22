/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalEditor,
  Selection,
  LexicalNode,
  ParsedNodeMap,
  NodeKey,
  TextNode,
  ElementNode,
  TextMutation,
  DOMConversionMap,
} from 'lexical';

import isTokenOrInert from 'shared/isTokenOrInert';
import {$cloneContents, $insertRichText} from '@lexical/helpers/selection';
import {
  $createTextNode,
  $createNodeFromParse,
  $isTextNode,
  $isElementNode,
  $isDecoratorNode,
  $log,
  $getSelection,
  $getRoot,
  $setCompositionKey,
  $getCompositionKey,
  $getNearestNodeFromDOMNode,
  $flushMutations,
  $createLineBreakNode,
} from 'lexical';
import {IS_FIREFOX, IS_APPLE} from 'shared/environment';
import getPossibleDecoratorNode from 'shared/getPossibleDecoratorNode';
import {$createListNode} from 'lexical/ListNode';
import {$createListItemNode} from 'lexical/ListItemNode';
import {$createParagraphNode} from 'lexical/ParagraphNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$createLinkNode} from 'lexical/LinkNode';
import {$createCodeNode} from 'lexical/CodeNode';

// TODO we shouldn't really be importing from core here.
import {TEXT_TYPE_TO_FORMAT} from '../../lexical/src/LexicalConstants';

const NO_BREAK_SPACE_CHAR = '\u00A0';

let lastKeyWasMaybeAndroidSoftKey = false;

// TODO the Flow types here needs fixing
export type EventHandler = (
  // $FlowFixMe: not sure how to handle this generic properly
  event: Object,
  editor: LexicalEditor,
) => void;

const isCodeElement = (div: HTMLDivElement): boolean => {
  return div.style.fontFamily.match('monospace') !== null;
};

const DOM_NODE_NAME_TO_LEXICAL_NODE: DOMConversionMap = {
  ul: () => ({node: $createListNode('ul')}),
  ol: () => ({node: $createListNode('ol')}),
  li: () => ({node: $createListItemNode()}),
  h1: () => ({node: $createHeadingNode('h1')}),
  h2: () => ({node: $createHeadingNode('h2')}),
  h3: () => ({node: $createHeadingNode('h3')}),
  h4: () => ({node: $createHeadingNode('h4')}),
  h5: () => ({node: $createHeadingNode('h5')}),
  p: () => ({node: $createParagraphNode()}),
  br: () => ({node: $createLineBreakNode()}),
  a: (domNode: Node) => {
    let node;
    if (domNode instanceof HTMLAnchorElement) {
      node = $createLinkNode(domNode.href);
    } else {
      node = $createTextNode(domNode.textContent);
    }
    return {node};
  },
  u: (domNode: Node) => {
    return {node: null, format: 'underline'};
  },
  b: (domNode: Node) => {
    return {node: null, format: 'bold'};
  },
  strong: (domNode: Node) => {
    return {node: null, format: 'bold'};
  },
  i: (domNode: Node) => {
    return {node: null, format: 'italic'};
  },
  em: (domNode: Node) => {
    return {node: null, format: 'italic'};
  },
  td: (domNode: Node) => {
    // $FlowFixMe[incompatible-type] domNode is a <table> since we matched it by nodeName
    const cell: HTMLTableCellElement = domNode;
    const isGitHubCodeCell = cell.classList.contains('js-file-line');

    return {
      node: null,
      after: (lexicalNodes) => {
        if (
          isGitHubCodeCell &&
          cell.parentNode &&
          cell.parentNode.nextSibling
        ) {
          // Append newline between code lines
          lexicalNodes.push($createLineBreakNode());
        }
        return lexicalNodes;
      },
    };
  },
  table: (domNode: Node) => {
    // $FlowFixMe[incompatible-type] domNode is a <table> since we matched it by nodeName
    const table: HTMLTableElement = domNode;
    const isGitHubCodeTable = table.classList.contains(
      'js-file-line-container',
    );

    return {
      node: isGitHubCodeTable ? $createCodeNode() : null,
    };
  },
  span: (domNode: Node) => ({node: null}),
  '#text': (domNode: Node) => ({node: $createTextNode(domNode.textContent)}),
  pre: (domNode: Node) => ({node: $createCodeNode()}),
  div: (domNode: Node) => {
    // $FlowFixMe[incompatible-type] domNode is a <table> since we matched it by nodeName
    const div: HTMLDivElement = domNode;

    return {
      node: isCodeElement(div) ? $createCodeNode() : null,
      after: (lexicalNodes) => {
        const domParent = div.parentNode;
        if (domParent != null && div !== domParent.lastChild) {
          lexicalNodes.push($createLineBreakNode());
        }
        return lexicalNodes;
      },
    };
  },
};

function updateAndroidSoftKeyFlagIfAny(event: KeyboardEvent): void {
  lastKeyWasMaybeAndroidSoftKey =
    event.key === 'Unidentified' && event.keyCode === 229;
}

function $generateNodes(nodeRange: {
  range: Array<NodeKey>,
  nodeMap: ParsedNodeMap,
}): Array<LexicalNode> {
  const {range, nodeMap} = nodeRange;
  const parsedNodeMap: ParsedNodeMap = new Map(nodeMap);
  const nodes = [];
  for (let i = 0; i < range.length; i++) {
    const key = range[i];
    const parsedNode = parsedNodeMap.get(key);
    if (parsedNode !== undefined) {
      const node = $createNodeFromParse(parsedNode, parsedNodeMap);
      nodes.push(node);
    }
  }
  return nodes;
}

export function $createNodesFromDOM(
  node: Node,
  conversionMap: DOMConversionMap,
  editor: LexicalEditor,
  textFormat?: number,
): Array<LexicalNode> {
  let lexicalNodes: Array<LexicalNode> = [];
  let currentLexicalNode = null;
  let currentTextFormat = textFormat;
  const nodeName = node.nodeName.toLowerCase();
  const customHtmlTransforms = editor._config.htmlTransforms || {};
  const transformFunction =
    customHtmlTransforms[nodeName] || conversionMap[nodeName];

  const transformOutput = transformFunction ? transformFunction(node) : null;
  let postTransform = null;

  if (transformOutput !== null) {
    postTransform = transformOutput.after;
    currentLexicalNode = transformOutput.node;
    if (transformOutput.format) {
      const nextTextFormat = TEXT_TYPE_TO_FORMAT[transformOutput.format];
      currentTextFormat = currentTextFormat
        ? currentTextFormat ^ nextTextFormat
        : nextTextFormat;
    }

    if (currentLexicalNode !== null) {
      // If the transformed node is a a TextNode, apply text formatting
      if ($isTextNode(currentLexicalNode) && currentTextFormat !== undefined) {
        currentLexicalNode.setFormat(currentTextFormat);
      }
      lexicalNodes.push(currentLexicalNode);
    }
  }

  // If the DOM node doesn't have a transformer, we don't know what
  // to do with it but we still need to process any childNodes.
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    const childLexicalNodes = $createNodesFromDOM(
      children[i],
      conversionMap,
      editor,
      currentTextFormat,
    );
    if ($isElementNode(currentLexicalNode)) {
      // If the current node is a ElementNode after transformation,
      // we can append all the children to it.
      currentLexicalNode.append(...childLexicalNodes);
    } else if (currentLexicalNode === null) {
      // If it doesn't have a transformer, we hoist its children
      // up to the same level as it.
      lexicalNodes = lexicalNodes.concat(childLexicalNodes);
    }
  }
  if (postTransform != null) {
    lexicalNodes = postTransform(lexicalNodes, currentLexicalNode);
  }
  return lexicalNodes;
}

function $generateNodesFromDOM(
  dom: Document,
  conversionMap: DOMConversionMap,
  editor: LexicalEditor,
): Array<LexicalNode> {
  let lexicalNodes = [];
  const elements: Array<Node> = dom.body ? Array.from(dom.body.childNodes) : [];
  const elementsLength = elements.length;
  for (let i = 0; i < elementsLength; i++) {
    const lexicalNode = $createNodesFromDOM(elements[i], conversionMap, editor);
    if (lexicalNode !== null) {
      lexicalNodes = lexicalNodes.concat(lexicalNode);
    }
  }
  return lexicalNodes;
}

function $insertDataTransferForRichText(
  dataTransfer: DataTransfer,
  selection: Selection,
  editor: LexicalEditor,
): void {
  const lexicalNodesString = dataTransfer.getData(
    'application/x-lexical-nodes',
  );

  if (lexicalNodesString) {
    try {
      const nodeRange = JSON.parse(lexicalNodesString);
      const nodes = $generateNodes(nodeRange);
      selection.insertNodes(nodes);
      return;
    } catch (e) {
      // Malformed, missing nodes..
    }
  }

  const textHtmlMimeType = 'text/html';
  const htmlString = dataTransfer.getData(textHtmlMimeType);

  if (htmlString) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlString, textHtmlMimeType);
    const nodes = $generateNodesFromDOM(
      dom,
      DOM_NODE_NAME_TO_LEXICAL_NODE,
      editor,
    );
    // Wrap text and inline nodes in paragraph nodes so we have all blocks at the top-level
    const topLevelBlocks = [];
    let currentBlock = null;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!$isElementNode(node) || node.isInline()) {
        if (currentBlock === null) {
          currentBlock = $createParagraphNode();
          topLevelBlocks.push(currentBlock);
        }
        if (currentBlock !== null) {
          currentBlock.append(node);
        }
      } else {
        topLevelBlocks.push(node);
        currentBlock = null;
      }
    }
    selection.insertNodes(topLevelBlocks);
    return;
  }
  $insertDataTransferForPlainText(dataTransfer, selection);
}

function $insertDataTransferForPlainText(
  dataTransfer: DataTransfer,
  selection: Selection,
): void {
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    $insertRichText(selection, text);
  }
}

export function $shouldOverrideDefaultCharacterSelection(
  selection: Selection,
  isBackward: boolean,
): boolean {
  const possibleDecoratorNode = getPossibleDecoratorNode(
    selection.focus,
    isBackward,
  );
  return $isDecoratorNode(possibleDecoratorNode);
}

function controlOrMeta(metaKey: boolean, ctrlKey: boolean): boolean {
  if (IS_APPLE) {
    return metaKey;
  }
  return ctrlKey;
}

function isReturn(keyCode: number): boolean {
  return keyCode === 13;
}

function isBackspace(keyCode: number): boolean {
  return keyCode === 8;
}

function isEscape(keyCode: number): boolean {
  return keyCode === 27;
}

function isDelete(keyCode: number): boolean {
  return keyCode === 46;
}

function isTab(keyCode: number, altKey, ctrlKey, metaKey): boolean {
  return keyCode === 9 && !altKey && !ctrlKey && !metaKey;
}

function isBold(keyCode: number, metaKey: boolean, ctrlKey: boolean): boolean {
  return keyCode === 66 && controlOrMeta(metaKey, ctrlKey);
}

function isItalic(
  keyCode: number,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 73 && controlOrMeta(metaKey, ctrlKey);
}

function isUnderline(
  keyCode: number,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 85 && controlOrMeta(metaKey, ctrlKey);
}

function isParagraph(keyCode: number, shiftKey: boolean): boolean {
  return isReturn(keyCode) && !shiftKey;
}

function isLineBreak(keyCode: number, shiftKey: boolean): boolean {
  return isReturn(keyCode) && shiftKey;
}

// Inserts a new line after the selection
function isOpenLineBreak(keyCode: number, ctrlKey: boolean): boolean {
  // 79 = KeyO
  return IS_APPLE && ctrlKey && keyCode === 79;
}

function isDeleteWordBackward(
  keyCode: number,
  altKey: boolean,
  ctrlKey: boolean,
): boolean {
  return isBackspace(keyCode) && (IS_APPLE ? altKey : ctrlKey);
}

function isDeleteWordForward(
  keyCode: number,
  altKey: boolean,
  ctrlKey: boolean,
): boolean {
  return isDelete(keyCode) && (IS_APPLE ? altKey : ctrlKey);
}

function isDeleteLineBackward(keyCode: number, metaKey: boolean): boolean {
  return IS_APPLE && metaKey && isBackspace(keyCode);
}

function isDeleteLineForward(keyCode: number, metaKey: boolean): boolean {
  return IS_APPLE && metaKey && isDelete(keyCode);
}

function isDeleteBackward(
  keyCode: number,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (IS_APPLE) {
    if (altKey || metaKey) {
      return false;
    }
    return isBackspace(keyCode) || (keyCode === 72 && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isBackspace(keyCode);
}

function isDeleteForward(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isDelete(keyCode) || (keyCode === 68 && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isDelete(keyCode);
}

function isUndo(
  keyCode: number,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 90 && !shiftKey && controlOrMeta(metaKey, ctrlKey);
}

function isRedo(
  keyCode: number,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (IS_APPLE) {
    return keyCode === 90 && metaKey && shiftKey;
  }
  return (keyCode === 89 && ctrlKey) || (keyCode === 90 && ctrlKey && shiftKey);
}

function isArrowLeft(keyCode: number): boolean {
  return keyCode === 37;
}

function isArrowRight(keyCode: number): boolean {
  return keyCode === 39;
}

function isArrowUp(keyCode: number): boolean {
  return keyCode === 38;
}

function isArrowDown(keyCode: number): boolean {
  return keyCode === 40;
}

function isMoveBackward(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowLeft(keyCode) && !ctrlKey && !metaKey && !altKey;
}

function isMoveForward(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowRight(keyCode) && !ctrlKey && !metaKey && !altKey;
}

function isMoveUp(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowUp(keyCode) && !ctrlKey && !metaKey && !altKey;
}

function isMoveDown(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowDown(keyCode) && !ctrlKey && !metaKey && !altKey;
}

export function onKeyDown(event: KeyboardEvent, editor: LexicalEditor): void {
  updateAndroidSoftKeyFlagIfAny(event);
  if (editor.isComposing()) {
    return;
  }
  editor.update(() => {
    $log('onKeyDown');

    const selection = $getSelection();
    if (selection === null) {
      return;
    }
    const {keyCode, shiftKey, ctrlKey, metaKey, altKey} = event;

    if (isMoveForward(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
      editor.execCommand('keyArrowRight', event);
    } else if (isMoveBackward(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
      editor.execCommand('keyArrowLeft', event);
    } else if (isMoveUp(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
      editor.execCommand('keyArrowUp', event);
    } else if (isMoveDown(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
      editor.execCommand('keyArrowDown', event);
    } else if (isLineBreak(keyCode, shiftKey)) {
      editor.execCommand('keyEnter', event);
    } else if (isOpenLineBreak(keyCode, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('insertLineBreak', true);
    } else if (isParagraph(keyCode, shiftKey)) {
      editor.execCommand('keyEnter', event);
    } else if (isDeleteBackward(keyCode, altKey, metaKey, ctrlKey)) {
      if (isBackspace(keyCode)) {
        editor.execCommand('keyBackspace', event);
      } else {
        editor.execCommand('deleteCharacter', true);
      }
    } else if (isEscape(keyCode)) {
      editor.execCommand('keyEscape', event);
    } else if (isDeleteForward(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
      if (isDelete(keyCode)) {
        editor.execCommand('keyDelete', event);
      } else {
        editor.execCommand('deleteCharacter', false);
      }
    } else if (isDeleteWordBackward(keyCode, altKey, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('deleteWord', true);
    } else if (isDeleteWordForward(keyCode, altKey, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('deleteWord', false);
    } else if (isDeleteLineBackward(keyCode, metaKey)) {
      event.preventDefault();
      editor.execCommand('deleteLine', true);
    } else if (isDeleteLineForward(keyCode, metaKey)) {
      event.preventDefault();
      editor.execCommand('deleteLine', false);
    } else if (isBold(keyCode, metaKey, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('formatText', 'bold');
    } else if (isUnderline(keyCode, metaKey, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('formatText', 'underline');
    } else if (isItalic(keyCode, metaKey, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('formatText', 'italic');
    } else if (isTab(keyCode, altKey, ctrlKey, metaKey)) {
      editor.execCommand('keyTab', event);
    } else if (isUndo(keyCode, shiftKey, metaKey, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('undo');
    } else if (isRedo(keyCode, shiftKey, metaKey, ctrlKey)) {
      event.preventDefault();
      editor.execCommand('redo');
    }
  });
}

export function onPasteForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    $log('onPasteForPlainText');
    const selection = $getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      $insertDataTransferForPlainText(clipboardData, selection);
    }
  });
}

export function onPasteForRichText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    $log('onPasteForRichText');
    const selection = $getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      $insertDataTransferForRichText(clipboardData, selection, editor);
    }
  });
}

export function onDropPolyfill(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  // This should only occur without beforeInput. Block it as it's too much
  // hassle to make work at this point.
  event.preventDefault();
}

export function onDragStartPolyfill(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  // Block dragging.
  event.preventDefault();
}

export function onCutForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  onCopyForPlainText(event, editor);
  editor.update(() => {
    $log('onCutForPlainText');
    const selection = $getSelection();
    if (selection !== null) {
      selection.removeText();
    }
  });
}

export function onCutForRichText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  onCopyForRichText(event, editor);
  editor.update(() => {
    $log('onCutForRichText');
    const selection = $getSelection();
    if (selection !== null) {
      selection.removeText();
    }
  });
}

export function onCopyForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    $log('onCopyForPlainText');
    const clipboardData = event.clipboardData;
    const selection = $getSelection();
    if (selection !== null) {
      if (clipboardData != null) {
        const domSelection = window.getSelection();
        // If we haven't selected a range, then don't copy anything
        if (domSelection.isCollapsed) {
          return;
        }
        const range = domSelection.getRangeAt(0);
        if (range) {
          const container = document.createElement('div');
          const frag = range.cloneContents();
          container.appendChild(frag);
          clipboardData.setData('text/html', container.innerHTML);
        }
        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}

export function onCopyForRichText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    $log('onCopyForRichText');
    const clipboardData = event.clipboardData;
    const selection = $getSelection();
    if (selection !== null) {
      if (clipboardData != null) {
        const domSelection = window.getSelection();
        // If we haven't selected a range, then don't copy anything
        if (domSelection.isCollapsed) {
          return;
        }
        const range = domSelection.getRangeAt(0);
        if (range) {
          const container = document.createElement('div');
          const frag = range.cloneContents();
          container.appendChild(frag);
          clipboardData.setData('text/html', container.innerHTML);
        }
        clipboardData.setData('text/plain', selection.getTextContent());
        clipboardData.setData(
          'application/x-lexical-nodes',
          JSON.stringify($cloneContents(selection)),
        );
      }
    }
  });
}

export function onCompositionStart(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  editor.update(() => {
    $log('onCompositionStart');
    const selection = $getSelection();
    if (selection !== null && !editor.isComposing()) {
      const anchor = selection.anchor;
      $setCompositionKey(anchor.key);
      const data = event.data;
      if (
        data != null &&
        (!lastKeyWasMaybeAndroidSoftKey ||
          anchor.type === 'element' ||
          !selection.isCollapsed())
      ) {
        // We insert an empty space, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        editor.execCommand('insertText', ' ');
      }
    }
  });
}

function onCompositionEndInternal(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  editor.update(() => {
    $log('onCompositionEnd');
    $setCompositionKey(null);
    $updateSelectedTextFromDOM(editor, true);
  });
}

export function onCompositionEnd(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  if (IS_FIREFOX) {
    // The order of onInput and onCompositionEnd is different
    // in FF. Given that onInput will fire after onCompositionEnd
    // in FF, we need to defer the $logic for onCompositionEnd to
    // ensure that any possible onInput events fire before.
    setTimeout(() => {
      onCompositionEndInternal(event, editor);
    }, 0);
  } else {
    onCompositionEndInternal(event, editor);
  }
}

function getLastSelection(editor: LexicalEditor): null | Selection {
  return editor.getEditorState().read(() => $getSelection());
}

// This is a work-around is mainly Chrome specific bug where if you select
// the contents of an empty block, you cannot easily unselect anything.
// This results in a tiny selection box that looks buggy/broken. This can
// also help other browsers when selection might "appear" lost, when it
// really isn't.
export function onClick(event: MouseEvent, editor: LexicalEditor): void {
  editor.update(() => {
    $log('onClick');
    const selection = $getSelection();
    if (selection === null) {
      return;
    }
    const anchor = selection.anchor;
    if (
      anchor.type === 'element' &&
      anchor.offset === 0 &&
      selection.isCollapsed() &&
      $getRoot().getChildrenSize() === 1 &&
      anchor.getNode().getTopLevelElementOrThrow().isEmpty()
    ) {
      const lastSelection = getLastSelection(editor);
      if (lastSelection !== null && selection.is(lastSelection)) {
        window.getSelection().removeAllRanges();
        selection.dirty = true;
      }
    }
  });
}

export function onSelectionChange(event: Event, editor: LexicalEditor): void {
  const domSelection = window.getSelection();
  const rootElement = editor.getRootElement();
  // This is a hot-path, so let's avoid doing an update when
  // the anchorNode is not actually inside the editor.
  if (rootElement && !rootElement.contains(domSelection.anchorNode)) {
    return;
  }

  // This update functions as a way of reconciling a bad selection
  // to a good selection.
  editor.update(() => {
    $log('onSelectionChange');
    const selection = $getSelection();
    // Update the selection format
    if (selection !== null && selection.isCollapsed()) {
      const anchor = selection.anchor;
      if (anchor.type === 'text') {
        const anchorNode = anchor.getNode();
        selection.format = anchorNode.getFormat();
      } else if (anchor.type === 'element') {
        selection.format = 0;
      }
    }
    editor.execCommand('selectionChange');
  });
}

export function checkForBadInsertion(
  anchorElement: HTMLElement,
  anchorNode: TextNode,
  editor: LexicalEditor,
): boolean {
  const nextSibling = anchorNode.getNextSibling();

  return (
    anchorElement.parentNode === null ||
    (nextSibling !== null &&
      editor.getElementByKey(nextSibling.getKey()) !==
        anchorElement.nextSibling)
  );
}

function $shouldInsertTextAfterOrBeforeTextNode(
  selection: Selection,
  node: TextNode,
): boolean {
  if (node.isSegmented()) {
    return true;
  }
  if (!selection.isCollapsed()) {
    return false;
  }
  const offset = selection.anchor.offset;
  const parent = node.getParentOrThrow();
  const isToken = node.isToken();
  const shouldInsertTextBefore =
    offset === 0 &&
    (!node.canInsertTextBefore() || !parent.canInsertTextBefore() || isToken);
  const shouldInsertTextAfter =
    node.getTextContentSize() === offset &&
    (!node.canInsertTextBefore() || !parent.canInsertTextBefore() || isToken);
  return shouldInsertTextBefore || shouldInsertTextAfter;
}

function $updateTextNodeFromDOMContent(
  textNode: TextNode,
  textContent: string,
  anchorOffset: null | number,
  focusOffset: null | number,
  compositionEnd: boolean,
): void {
  let node = textNode;
  if (node.isAttached() && (compositionEnd || !node.isDirty())) {
    const isComposing = node.isComposing();
    let normalizedTextContent = textContent;

    if (
      (isComposing || compositionEnd) &&
      textContent[textContent.length - 1] === NO_BREAK_SPACE_CHAR
    ) {
      normalizedTextContent = textContent.slice(0, -1);
    }

    if (compositionEnd || normalizedTextContent !== node.getTextContent()) {
      if (normalizedTextContent === '') {
        if (isComposing) {
          $setCompositionKey(null);
        }
        node.remove();
        return;
      }
      if (
        isTokenOrInert(node) ||
        ($getCompositionKey() !== null && !isComposing)
      ) {
        node.markDirty();
        return;
      }
      const selection = $getSelection();

      if (selection === null || anchorOffset === null || focusOffset === null) {
        node.setTextContent(normalizedTextContent);
        return;
      }
      selection.setTextNodeRange(node, anchorOffset, node, focusOffset);

      if (node.isSegmented()) {
        const originalTextContent = node.getTextContent();
        const replacement = $createTextNode(originalTextContent);
        node.replace(replacement);
        node = replacement;
      }
      node = node.setTextContent(normalizedTextContent);
    }
  }
}

function $applyTargetRange(selection: Selection, event: InputEvent): void {
  if (event.getTargetRanges) {
    const targetRange = event.getTargetRanges()[0];

    if (targetRange) {
      selection.applyDOMRange(targetRange);
    }
  }
}

function $canRemoveText(
  anchorNode: TextNode | ElementNode,
  focusNode: TextNode | ElementNode,
): boolean {
  return (
    anchorNode !== focusNode ||
    $isElementNode(anchorNode) ||
    $isElementNode(focusNode) ||
    !isTokenOrInert(anchorNode) ||
    !isTokenOrInert(focusNode)
  );
}

function $shouldPreventDefaultAndInsertText(
  selection: Selection,
  text: string,
  isBeforeInput: boolean,
): boolean {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();

  return (
    anchor.key !== focus.key ||
    // If we're working with a range that is not during composition.
    (anchor.offset !== focus.offset && !anchorNode.isComposing()) ||
    // If the text length is more than a single character and we're either
    // dealing with this in "beforeinput" or where the node has already recently
    // been changed (thus is dirty).
    ((isBeforeInput || anchorNode.isDirty()) && text.length > 1) ||
    // If we're working with a non-text node.
    !$isTextNode(anchorNode) ||
    // Check if we're changing from bold to italics, or some other format.
    anchorNode.getFormat() !== selection.format ||
    // One last set of heuristics to check against.
    $shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode)
  );
}

export function onBeforeInput(event: InputEvent, editor: LexicalEditor): void {
  const inputType = event.inputType;

  // We let the browser do its own thing for composition.
  if (
    inputType === 'deleteCompositionText' ||
    inputType === 'insertCompositionText'
  ) {
    return;
  }

  editor.update(() => {
    $log('onBeforeInputForRichText');
    const selection = $getSelection();

    if (selection === null) {
      return;
    }

    if (inputType === 'deleteContentBackward') {
      // Used for Android
      $setCompositionKey(null);
      event.preventDefault();
      editor.execCommand('deleteCharacter', true);
      return;
    }
    const data = event.data;

    if (!selection.dirty && selection.isCollapsed()) {
      $applyTargetRange(selection, event);
    }
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();

    if (inputType === 'insertText') {
      if (data === '\n') {
        event.preventDefault();
        editor.execCommand('insertLineBreak');
      } else if (data === '\n\n') {
        event.preventDefault();
        editor.execCommand('insertParagraph');
      } else if (data == null && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain');
        event.preventDefault();
        $insertRichText(selection, text);
      } else if (
        data != null &&
        $shouldPreventDefaultAndInsertText(selection, data, true)
      ) {
        event.preventDefault();
        editor.execCommand('insertText', data);
      }
      return;
    }

    // Prevent the browser from carrying out
    // the input event, so we can control the
    // output.
    event.preventDefault();

    switch (inputType) {
      case 'insertFromComposition': {
        if (data) {
          // This is the end of composition
          $setCompositionKey(null);
          editor.execCommand('insertText', data);
        }
        break;
      }
      case 'insertLineBreak': {
        // Used for Android
        $setCompositionKey(null);
        editor.execCommand('insertLineBreak');
        break;
      }
      case 'insertParagraph': {
        // Used for Android
        $setCompositionKey(null);
        editor.execCommand('insertParagraph');
        break;
      }
      case 'insertFromYank':
      case 'insertFromDrop':
      case 'insertReplacementText':
      case 'insertFromPaste': {
        const dataTransfer = event.dataTransfer;
        if (dataTransfer != null) {
          $insertDataTransferForPlainText(dataTransfer, selection);
        } else {
          if (data) {
            editor.execCommand('insertText', data);
          }
        }
        break;
      }
      case 'deleteByComposition': {
        if ($canRemoveText(anchorNode, focusNode)) {
          editor.execCommand('removeText');
        }
        break;
      }
      case 'deleteByDrag':
      case 'deleteByCut': {
        editor.execCommand('removeText');
        break;
      }
      case 'deleteContent': {
        editor.execCommand('deleteCharacter', false);
        break;
      }
      case 'deleteWordBackward': {
        editor.execCommand('deleteWord', true);
        break;
      }
      case 'deleteWordForward': {
        editor.execCommand('deleteWord', false);
        break;
      }
      case 'deleteHardLineBackward':
      case 'deleteSoftLineBackward': {
        editor.execCommand('deleteLine', true);
        break;
      }
      case 'deleteContentForward':
      case 'deleteHardLineForward':
      case 'deleteSoftLineForward': {
        editor.execCommand('deleteLine', false);
        break;
      }
      case 'formatStrikeThrough': {
        editor.execCommand('formatText', 'strikethrough');
        break;
      }
      case 'formatBold': {
        editor.execCommand('formatText', 'bold');
        break;
      }
      case 'formatItalic': {
        editor.execCommand('formatText', 'italic');
        break;
      }
      case 'formatUnderline': {
        editor.execCommand('formatText', 'underline');
        break;
      }
      case 'historyUndo': {
        editor.execCommand('undo');
        break;
      }
      case 'historyRedo': {
        editor.execCommand('redo');
        break;
      }
      default:
      // NO-OP
    }
  });
}

function $updateSelectedTextFromDOM(
  editor: LexicalEditor,
  compositionEnd: boolean,
): void {
  // Update the text content with the latest composition text
  const domSelection = window.getSelection();
  if (domSelection === null) {
    return;
  }
  const {anchorNode, anchorOffset, focusOffset} = domSelection;
  if (anchorNode !== null && anchorNode.nodeType === 3) {
    const node = $getNearestNodeFromDOMNode(anchorNode);
    if ($isTextNode(node)) {
      $updateTextNodeFromDOMContent(
        node,
        anchorNode.nodeValue,
        anchorOffset,
        focusOffset,
        compositionEnd,
      );
    }
  }
}

export function onInput(event: InputEvent, editor: LexicalEditor): void {
  // We don't want the onInput to bubble, in the case of nested editors.
  event.stopPropagation();
  editor.update(() => {
    $log('onInput');
    const selection = $getSelection();
    const data = event.data;
    if (
      data != null &&
      selection !== null &&
      $shouldPreventDefaultAndInsertText(selection, data, false)
    ) {
      editor.execCommand('insertText', data);
    } else {
      $updateSelectedTextFromDOM(editor, false);
    }
    // Also flush any other mutations that might have occured
    // since the change.
    $flushMutations();
  });
}

export function $onTextMutation(mutation: TextMutation): void {
  // We attempt to merge any text mutations that have occured outside of Lexical
  // back into Lexical's editor state.
  const node = mutation.node;
  const anchorOffset = mutation.anchorOffset;
  const focusOffset = mutation.focusOffset;
  const text = mutation.text;
  $updateTextNodeFromDOMContent(node, text, anchorOffset, focusOffset, false);
}
