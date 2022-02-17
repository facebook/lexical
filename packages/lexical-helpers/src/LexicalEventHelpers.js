/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DOMChildConversion} from '../../lexical/src/LexicalEditor';
import type {
  DOMConversionMap,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  ParsedNodeMap,
  RangeSelection,
} from 'lexical';

import {$cloneContents} from '@lexical/helpers/selection';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {
  $createLineBreakNode,
  $createNodeFromParse,
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isTextNode,
} from 'lexical';
import {$createCodeNode} from 'lexical/CodeNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$createLinkNode} from 'lexical/LinkNode';
import getPossibleDecoratorNode from 'shared/getPossibleDecoratorNode';

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
  '#text': (domNode: Node) => ({node: $createTextNode(domNode.textContent)}),
  a: (domNode: Node) => {
    let node;
    if (domNode instanceof HTMLAnchorElement) {
      node = $createLinkNode(domNode.href);
    } else {
      node = $createTextNode(domNode.textContent);
    }
    return {node};
  },
  b: (domNode: Node) => {
    // $FlowFixMe[incompatible-type] domNode is a <b> since we matched it by nodeName
    const b: HTMLElement = domNode;
    // Google Docs wraps all copied HTML in a <b> with font-weight normal
    const hasNormalFontWeight = b.style.fontWeight === 'normal';
    return {
      forChild: (lexicalNode) => {
        if ($isTextNode(lexicalNode) && !hasNormalFontWeight) {
          lexicalNode.toggleFormat('bold');
        }
      },
      node: null,
    };
  },
  br: () => ({node: $createLineBreakNode()}),
  div: (domNode: Node) => {
    // $FlowFixMe[incompatible-type] domNode is a <div> since we matched it by nodeName
    const div: HTMLDivElement = domNode;

    return {
      after: (childLexicalNodes) => {
        const domParent = domNode.parentNode;
        if (domParent != null && domNode !== domParent.lastChild) {
          childLexicalNodes.push($createLineBreakNode());
        }
        return childLexicalNodes;
      },
      node: isCodeElement(div) ? $createCodeNode() : null,
    };
  },
  em: (domNode: Node) => {
    return {
      forChild: (lexicalNode) => {
        if ($isTextNode(lexicalNode)) {
          lexicalNode.toggleFormat('italic');
        }
      },
      node: null,
    };
  },
  h1: () => ({node: $createHeadingNode('h1')}),
  h2: () => ({node: $createHeadingNode('h2')}),
  h3: () => ({node: $createHeadingNode('h3')}),
  h4: () => ({node: $createHeadingNode('h4')}),
  h5: () => ({node: $createHeadingNode('h5')}),
  i: (domNode: Node) => {
    return {
      forChild: (lexicalNode) => {
        if ($isTextNode(lexicalNode)) {
          lexicalNode.toggleFormat('italic');
        }
      },
      node: null,
    };
  },
  li: () => ({node: $createListItemNode()}),
  ol: () => ({node: $createListNode('ol')}),
  p: () => ({node: $createParagraphNode()}),
  pre: (domNode: Node) => ({node: $createCodeNode()}),
  span: (domNode: Node) => {
    // $FlowFixMe[incompatible-type] domNode is a <span> since we matched it by nodeName
    const span: HTMLSpanElement = domNode;
    // Google Docs uses span tags + font-weight for bold text
    const hasBoldFontWeight = span.style.fontWeight === '700';
    return {
      forChild: (lexicalNode) => {
        if ($isTextNode(lexicalNode) && hasBoldFontWeight) {
          lexicalNode.toggleFormat('bold');
        }
      },
      node: null,
    };
  },
  strong: (domNode: Node) => {
    return {
      forChild: (lexicalNode) => {
        if ($isTextNode(lexicalNode)) {
          lexicalNode.toggleFormat('bold');
        }
      },
      node: null,
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
  td: (domNode: Node) => {
    // $FlowFixMe[incompatible-type] domNode is a <table> since we matched it by nodeName
    const cell: HTMLTableCellElement = domNode;
    const isGitHubCodeCell = cell.classList.contains('js-file-line');

    return {
      after: (childLexicalNodes) => {
        if (
          isGitHubCodeCell &&
          cell.parentNode &&
          cell.parentNode.nextSibling
        ) {
          // Append newline between code lines
          childLexicalNodes.push($createLineBreakNode());
        }
        return childLexicalNodes;
      },
      node: null,
    };
  },
  u: (domNode: Node) => {
    return {
      forChild: (lexicalNode) => {
        if ($isTextNode(lexicalNode)) {
          lexicalNode.toggleFormat('underline');
        }
      },
      node: null,
    };
  },
  ul: () => ({node: $createListNode('ul')}),
};

function $generateNodes(nodeRange: {
  nodeMap: ParsedNodeMap,
  range: Array<NodeKey>,
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
  forChildMap: Map<string, DOMChildConversion> = new Map(),
): Array<LexicalNode> {
  let lexicalNodes: Array<LexicalNode> = [];
  let currentLexicalNode = null;
  const nodeName = node.nodeName.toLowerCase();
  const customHtmlTransforms = editor._config.htmlTransforms || {};
  const transformFunction =
    customHtmlTransforms[nodeName] || conversionMap[nodeName];

  const transformOutput = transformFunction ? transformFunction(node) : null;
  let postTransform = null;

  if (transformOutput !== null) {
    postTransform = transformOutput.after;
    currentLexicalNode = transformOutput.node;
    if (currentLexicalNode !== null) {
      lexicalNodes.push(currentLexicalNode);
      const forChildFunctions = Array.from(forChildMap.values());
      for (let i = 0; i < forChildFunctions.length; i++) {
        forChildFunctions[i](currentLexicalNode);
      }
    }

    if (transformOutput.forChild != null) {
      forChildMap.set(nodeName, transformOutput.forChild);
    }
  }

  // If the DOM node doesn't have a transformer, we don't know what
  // to do with it but we still need to process any childNodes.
  const children = node.childNodes;
  let childLexicalNodes = [];
  for (let i = 0; i < children.length; i++) {
    childLexicalNodes.push(
      ...$createNodesFromDOM(children[i], conversionMap, editor, forChildMap),
    );
  }
  if (postTransform != null) {
    childLexicalNodes = postTransform(childLexicalNodes);
  }
  if (currentLexicalNode == null) {
    // If it hasn't been converted to a LexicalNode, we hoist its children
    // up to the same level as it.
    lexicalNodes = lexicalNodes.concat(childLexicalNodes);
  } else {
    if ($isElementNode(currentLexicalNode)) {
      // If the current node is a ElementNode after conversion,
      // we can append all the children to it.
      currentLexicalNode.append(...childLexicalNodes);
    }
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

export function $insertDataTransferForRichText(
  dataTransfer: DataTransfer,
  selection: RangeSelection,
  editor: LexicalEditor,
): void {
  const lexicalNodesString = dataTransfer.getData(
    'application/x-lexical-editor',
  );

  if (lexicalNodesString) {
    const namespace = editor._config.namespace;
    try {
      const lexicalClipboardData = JSON.parse(lexicalNodesString);
      if (lexicalClipboardData.namespace === namespace) {
        const nodeRange = lexicalClipboardData.state;
        const nodes = $generateNodes(nodeRange);
        selection.insertNodes(nodes);
        return;
      }
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

export function $insertDataTransferForPlainText(
  dataTransfer: DataTransfer,
  selection: RangeSelection,
): void {
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    selection.insertRawText(text);
  }
}

export function $shouldOverrideDefaultCharacterSelection(
  selection: RangeSelection,
  isBackward: boolean,
): boolean {
  const possibleNode = getPossibleDecoratorNode(selection.focus, isBackward);
  return $isDecoratorNode(possibleNode) && !possibleNode.isIsolated();
}

export function onPasteForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
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
    const selection = $getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      $insertDataTransferForRichText(clipboardData, selection, editor);
    }
  });
}

export function onCutForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  onCopyForPlainText(event, editor);
  editor.update(() => {
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
        const namespace = editor._config.namespace;
        clipboardData.setData(
          'application/x-lexical-editor',
          JSON.stringify({namespace, state: $cloneContents(selection)}),
        );
      }
    }
  });
}
