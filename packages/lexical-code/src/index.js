/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// eslint-disable-next-line simple-import-sort/imports
import Prism from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-swift';

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  EditorThemeClasses,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
} from 'lexical';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
  mergeRegister,
} from '@lexical/utils';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  ElementNode,
  TextNode,
} from 'lexical';

const DEFAULT_CODE_LANGUAGE = 'javascript';

export const getDefaultCodeLanguage = (): string => DEFAULT_CODE_LANGUAGE;

export const getCodeLanguages = (): Array<string> =>
  Object.keys(Prism.languages)
    .filter(
      // Prism has several language helpers mixed into languages object
      // so filtering them out here to get langs list
      (language) => typeof Prism.languages[language] !== 'function',
    )
    .sort();

export class CodeHighlightNode extends TextNode {
  __highlightType: ?string;

  constructor(text: string, highlightType?: string, key?: NodeKey): void {
    super(text, key);
    this.__highlightType = highlightType;
  }

  static getType(): string {
    return 'code-highlight';
  }

  static clone(node: CodeHighlightNode): CodeHighlightNode {
    return new CodeHighlightNode(
      node.__text,
      node.__highlightType || undefined,
      node.__key,
    );
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = super.createDOM(config);
    const className = getHighlightThemeClass(
      config.theme,
      this.__highlightType,
    );
    addClassNamesToElement(element, className);
    return element;
  }

  updateDOM<EditorContext>(
    // $FlowFixMe
    prevNode: CodeHighlightNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    const update = super.updateDOM(prevNode, dom, config);
    const prevClassName = getHighlightThemeClass(
      config.theme,
      prevNode.__highlightType,
    );
    const nextClassName = getHighlightThemeClass(
      config.theme,
      this.__highlightType,
    );
    if (prevClassName !== nextClassName) {
      if (prevClassName) {
        removeClassNamesFromElement(dom, prevClassName);
      }
      if (nextClassName) {
        addClassNamesToElement(dom, nextClassName);
      }
    }
    return update;
  }

  // Prevent formatting (bold, underline, etc)
  setFormat(format: number): this {
    return this.getWritable();
  }
}

function getHighlightThemeClass(
  theme: EditorThemeClasses,
  highlightType: ?string,
): ?string {
  return (
    highlightType &&
    theme &&
    theme.codeHighlight &&
    theme.codeHighlight[highlightType]
  );
}

export function $createCodeHighlightNode(
  text: string,
  highlightType?: string,
): CodeHighlightNode {
  return new CodeHighlightNode(text, highlightType);
}

export function $isCodeHighlightNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CodeHighlightNode;
}

export class CodeNode extends ElementNode {
  __language: string | void;

  static getType(): string {
    return 'code';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__language, node.__key);
  }

  constructor(language?: string, key?: NodeKey): void {
    super(key);
    this.__language = language;
  }

  // View
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('code');
    addClassNamesToElement(element, config.theme.code);
    element.setAttribute('spellcheck', 'false');
    return element;
  }
  updateDOM(prevNode: CodeNode, dom: HTMLElement): boolean {
    return false;
  }

  static convertDOM(): DOMConversionMap | null {
    return {
      div: (node: Node) => ({
        conversion: convertDivElement,
        priority: 1,
      }),
      pre: (node: Node) => ({
        conversion: convertPreElement,
        priority: 0,
      }),
      table: (node: Node) => {
        // $FlowFixMe[incompatible-type] domNode is a <table> since we matched it by nodeName
        const table: HTMLTableElement = node;
        if (isGitHubCodeTable(table)) {
          return {
            conversion: convertTableElement,
            priority: 1,
          };
        }
        return null;
      },
      td: (node: Node) => {
        // $FlowFixMe[incompatible-type] element is a <td> since we matched it by nodeName
        const td: HTMLTableCellElement = node;
        if (isGitHubCodeCell(td)) {
          return {
            conversion: convertTableCellElement,
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  // Mutation
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | CodeHighlightNode {
    const children = this.getChildren();
    const childrenLength = children.length;

    if (
      childrenLength >= 2 &&
      children[childrenLength - 1].getTextContent() === '\n' &&
      children[childrenLength - 2].getTextContent() === '\n' &&
      selection.isCollapsed() &&
      selection.anchor.key === this.__key &&
      selection.anchor.offset === childrenLength
    ) {
      children[childrenLength - 1].remove();
      children[childrenLength - 2].remove();
      const newElement = $createParagraphNode();
      this.insertAfter(newElement);
      return newElement;
    }

    // If the selection is within the codeblock, find all leading tabs and
    // spaces of the current line. Create a new line that has all those
    // tabs and spaces, such that leading indentation is preserved.
    const anchor = selection.anchor.getNode();
    const firstNode = getFirstCodeHighlightNodeOfLine(anchor);
    if (firstNode != null) {
      let leadingWhitespace = 0;
      const firstNodeText = firstNode.getTextContent();
      while (
        leadingWhitespace < firstNodeText.length &&
        /[\t ]/.test(firstNodeText[leadingWhitespace])
      ) {
        leadingWhitespace += 1;
      }
      if (leadingWhitespace > 0) {
        const whitespace = firstNodeText.substring(0, leadingWhitespace);
        const indentedChild = $createCodeHighlightNode(whitespace);
        anchor.insertAfter(indentedChild);
        selection.insertNodes([$createLineBreakNode()]);
        indentedChild.select();
        return indentedChild;
      }
    }

    return null;
  }

  canInsertTab(): true {
    return true;
  }

  collapseAtStart(): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }

  setLanguage(language: string): void {
    const writable = this.getWritable();
    writable.__language = language;
  }

  getLanguage(): string | void {
    return this.getLatest().__language;
  }
}

export function $createCodeNode(language?: string): CodeNode {
  return new CodeNode(language);
}

export function $isCodeNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CodeNode;
}

export function getFirstCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): ?CodeHighlightNode {
  let currentNode = null;
  const previousSiblings = anchor.getPreviousSiblings();
  previousSiblings.push(anchor);
  while (previousSiblings.length > 0) {
    const node = previousSiblings.pop();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}

export function getLastCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): ?CodeHighlightNode {
  let currentNode = null;
  const nextSiblings = anchor.getNextSiblings();
  nextSiblings.unshift(anchor);
  while (nextSiblings.length > 0) {
    const node = nextSiblings.shift();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}

function convertPreElement(domNode: Node): DOMConversionOutput {
  return {node: $createCodeNode()};
}

function convertDivElement(domNode: Node): DOMConversionOutput {
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
}

function convertTableElement(): DOMConversionOutput {
  return {node: $createCodeNode()};
}

function convertTableCellElement(domNode: Node): DOMConversionOutput {
  // $FlowFixMe[incompatible-type] domNode is a <td> since we matched it by nodeName
  const cell: HTMLTableCellElement = domNode;
  return {
    after: (childLexicalNodes) => {
      if (cell.parentNode && cell.parentNode.nextSibling) {
        // Append newline between code lines
        childLexicalNodes.push($createLineBreakNode());
      }
      return childLexicalNodes;
    },
    node: null,
  };
}

function isCodeElement(div: HTMLDivElement): boolean {
  return div.style.fontFamily.match('monospace') !== null;
}

function isGitHubCodeCell(cell: HTMLTableCellElement): boolean %checks {
  return cell.classList.contains('js-file-line');
}

function isGitHubCodeTable(table: HTMLTableElement): boolean %checks {
  return table.classList.contains('js-file-line-container');
}

function textNodeTransform(node: TextNode, editor: LexicalEditor): void {
  // Since CodeNode has flat children structure we only need to check
  // if node's parent is a code node and run highlighting if so
  const parentNode = node.getParent();
  if ($isCodeNode(parentNode)) {
    codeNodeTransform(parentNode, editor);
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace($createTextNode(node.__text));
  }
}

// Using `skipTransforms` to prevent extra transforms since reformatting the code
// will not affect code block content itself.
//
// Using extra flag (`isHighlighting`) since both CodeNode and CodeHighlightNode
// trasnforms might be called at the same time (e.g. new CodeHighlight node inserted) and
// in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
// Especially when pasting code into CodeBlock.
let isHighlighting = false;
function codeNodeTransform(node: CodeNode, editor: LexicalEditor) {
  if (isHighlighting) {
    return;
  }
  isHighlighting = true;
  editor.update(
    () => {
      // When new code block inserted it might not have language selected
      if (node.getLanguage() === undefined) {
        node.setLanguage(DEFAULT_CODE_LANGUAGE);
      }

      updateAndRetainSelection(node, () => {
        const code = node.getTextContent();
        const tokens = Prism.tokenize(
          code,
          Prism.languages[node.getLanguage() || ''] ||
            Prism.languages[DEFAULT_CODE_LANGUAGE],
        );
        const highlightNodes = getHighlightNodes(tokens);
        const diffRange = getDiffRange(node.getChildren(), highlightNodes);
        const {from, to, nodesForReplacement} = diffRange;
        if (from !== to || nodesForReplacement.length) {
          node.splice(from, to - from, nodesForReplacement);
          return true;
        }
        return false;
      });
    },
    {
      onUpdate: () => {
        isHighlighting = false;
      },
      skipTransforms: true,
    },
  );
}

function getHighlightNodes(tokens): Array<LexicalNode> {
  const nodes = [];

  tokens.forEach((token) => {
    if (typeof token === 'string') {
      const partials = token.split('\n');
      for (let i = 0; i < partials.length; i++) {
        const text = partials[i];
        if (text.length) {
          nodes.push($createCodeHighlightNode(text));
        }
        if (i < partials.length - 1) {
          nodes.push($createLineBreakNode());
        }
      }
    } else {
      const {content} = token;
      if (typeof content === 'string') {
        nodes.push($createCodeHighlightNode(content, token.type));
      } else if (content.length === 1 && typeof content[0] === 'string') {
        nodes.push($createCodeHighlightNode(content[0], token.type));
      } else {
        nodes.push(...getHighlightNodes(content));
      }
    }
  });

  return nodes;
}

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function updateAndRetainSelection(
  node: CodeNode,
  updateFn: () => boolean,
): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.anchor) {
    return;
  }

  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const isNewLineAnchor =
    anchor.type === 'element' &&
    $isLineBreakNode(node.getChildAtIndex(anchor.offset - 1));
  let textOffset = 0;

  // Calculating previous text offset (all text node prior to anchor + anchor own text offset)
  if (!isNewLineAnchor) {
    const anchorNode = anchor.getNode();
    textOffset =
      anchorOffset +
      anchorNode.getPreviousSiblings().reduce((offset, _node) => {
        return (
          offset + ($isLineBreakNode(_node) ? 0 : _node.getTextContentSize())
        );
      }, 0);
  }

  const hasChanges = updateFn();
  if (!hasChanges) {
    return;
  }

  // Non-text anchors only happen for line breaks, otherwise
  // selection will be within text node (code highlight node)
  if (isNewLineAnchor) {
    anchor.getNode().select(anchorOffset, anchorOffset);
    return;
  }

  // If it was non-element anchor then we walk through child nodes
  // and looking for a position of original text offset
  node.getChildren().some((_node) => {
    if ($isTextNode(_node)) {
      const textContentSize = _node.getTextContentSize();
      if (textContentSize >= textOffset) {
        _node.select(textOffset, textOffset);
        return true;
      }
      textOffset -= textContentSize;
    }
    return false;
  });
}

// Finds minimal diff range between two nodes lists. It returns from/to range boundaries of prevNodes
// that needs to be replaced with `nodes` (subset of nextNodes) to make prevNodes equal to nextNodes.
function getDiffRange(
  prevNodes: Array<LexicalNode>,
  nextNodes: Array<LexicalNode>,
): {
  from: number,
  nodesForReplacement: Array<LexicalNode>,
  to: number,
} {
  let leadingMatch = 0;
  while (leadingMatch < prevNodes.length) {
    if (!isEqual(prevNodes[leadingMatch], nextNodes[leadingMatch])) {
      break;
    }
    leadingMatch++;
  }

  const prevNodesLength = prevNodes.length;
  const nextNodesLength = nextNodes.length;
  const maxTrailingMatch =
    Math.min(prevNodesLength, nextNodesLength) - leadingMatch;

  let trailingMatch = 0;
  while (trailingMatch < maxTrailingMatch) {
    trailingMatch++;
    if (
      !isEqual(
        prevNodes[prevNodesLength - trailingMatch],
        nextNodes[nextNodesLength - trailingMatch],
      )
    ) {
      trailingMatch--;
      break;
    }
  }

  const from = leadingMatch;
  const to = prevNodesLength - trailingMatch;
  const nodesForReplacement = nextNodes.slice(
    leadingMatch,
    nextNodesLength - trailingMatch,
  );
  return {
    from,
    nodesForReplacement,
    to,
  };
}

function isEqual(nodeA: LexicalNode, nodeB: LexicalNode): boolean {
  // Only checking for code higlight nodes and linebreaks. If it's regular text node
  // returning false so that it's transformed into code highlight node
  if ($isCodeHighlightNode(nodeA) && $isCodeHighlightNode(nodeB)) {
    return (
      nodeA.__text === nodeB.__text &&
      nodeA.__highlightType === nodeB.__highlightType
    );
  }

  if ($isLineBreakNode(nodeA) && $isLineBreakNode(nodeB)) {
    return true;
  }

  return false;
}

function handleMultilineIndent(
  type: 'indentContent' | 'outdentContent',
): boolean {
  const selection = $getSelection();

  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    return false;
  }

  // Only run multiline indent logic on selections exclusively composed of code highlights and linebreaks
  const nodes = selection.getNodes();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!$isCodeHighlightNode(node) && !$isLineBreakNode(node)) {
      return false;
    }
  }
  const startOfLine = getFirstCodeHighlightNodeOfLine(nodes[0]);

  if (startOfLine != null) {
    doIndent(startOfLine, type);
  }

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isLineBreakNode(nodes[i - 1]) && $isCodeHighlightNode(node)) {
      doIndent(node, type);
    }
  }

  return true;
}

function doIndent(
  node: CodeHighlightNode,
  type: 'indentContent' | 'outdentContent',
) {
  const text = node.getTextContent();
  if (type === 'indentContent') {
    // If the codeblock node doesn't start with whitespace, we don't want to
    // naively prepend a '\t'; Prism will then mangle all of our nodes when
    // it separates the whitespace from the first non-whitespace node. This
    // will lead to selection bugs when indenting lines that previously
    // didn't start with a whitespace character
    if (text.length > 0 && /\s/.test(text[0])) {
      node.setTextContent('\t' + text);
    } else {
      const indentNode = $createCodeHighlightNode('\t');
      node.insertBefore(indentNode);
    }
  } else {
    if (text.indexOf('\t') === 0) {
      // Same as above - if we leave empty text nodes lying around, the resulting
      // selection will be mangled
      if (text.length === 1) {
        node.remove();
      } else {
        node.setTextContent(text.substring(1));
      }
    }
  }
}

function handleShiftLines(
  type: 'keyArrowUp' | 'keyArrowDown',
  event: KeyboardEvent,
): boolean {
  // We only care about the alt+arrow keys
  const selection = $getSelection();
  if (!event.altKey || !$isRangeSelection(selection)) {
    return false;
  }

  // I'm not quite sure why, but it seems like calling anchor.getNode() collapses the selection here
  // So first, get the anchor and the focus, then get their nodes
  const {anchor, focus} = selection;
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  // Ensure the selection is within the codeblock
  if (!$isCodeHighlightNode(anchorNode) || !$isCodeHighlightNode(focusNode)) {
    return false;
  }
  const start = getFirstCodeHighlightNodeOfLine(anchorNode);
  const end = getLastCodeHighlightNodeOfLine(focusNode);
  if (start == null || end == null) {
    return false;
  }

  const range = start.getNodesBetween(end);
  for (let i = 0; i < range.length; i++) {
    const node = range[i];
    if (!$isCodeHighlightNode(node) && !$isLineBreakNode(node)) {
      return false;
    }
  }

  // After this point, we know the selection is within the codeblock. We may not be able to
  // actually move the lines around, but we want to return true either way to prevent
  // the event's default behavior
  event.preventDefault();
  event.stopPropagation(); // required to stop cursor movement under Firefox

  const arrowIsUp = type === 'keyArrowUp';
  const linebreak = arrowIsUp
    ? start.getPreviousSibling()
    : end.getNextSibling();
  if (!$isLineBreakNode(linebreak)) {
    return true;
  }
  const sibling = arrowIsUp
    ? linebreak.getPreviousSibling()
    : linebreak.getNextSibling();
  if (sibling == null) {
    return true;
  }

  const maybeInsertionPoint = arrowIsUp
    ? getFirstCodeHighlightNodeOfLine(sibling)
    : getLastCodeHighlightNodeOfLine(sibling);
  let insertionPoint =
    maybeInsertionPoint != null ? maybeInsertionPoint : sibling;
  linebreak.remove();
  range.forEach((node) => node.remove());
  if (type === 'keyArrowUp') {
    range.forEach((node) => insertionPoint.insertBefore(node));
    insertionPoint.insertBefore(linebreak);
  } else {
    insertionPoint.insertAfter(linebreak);
    insertionPoint = linebreak;
    range.forEach((node) => {
      insertionPoint.insertAfter(node);
      insertionPoint = node;
    });
  }

  selection.setTextNodeRange(anchorNode, anchorOffset, focusNode, focusOffset);

  return true;
}

export function registerCodeHighlighting(editor: LexicalEditor): () => void {
  if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    throw new Error(
      'CodeHighlightPlugin: CodeNode or CodeHighlightNode not registered on editor',
    );
  }

  return mergeRegister(
    editor.addNodeTransform(CodeNode, (node) =>
      codeNodeTransform(node, editor),
    ),
    editor.addNodeTransform(TextNode, (node) =>
      textNodeTransform(node, editor),
    ),
    editor.addNodeTransform(CodeHighlightNode, (node) =>
      textNodeTransform(node, editor),
    ),
    editor.registerCommandListener(
      'indentContent',
      (payload): boolean => handleMultilineIndent('indentContent'),
      1,
    ),
    editor.registerCommandListener(
      'outdentContent',
      (payload): boolean => handleMultilineIndent('outdentContent'),
      1,
    ),
    editor.registerCommandListener(
      'keyArrowUp',
      (payload): boolean => handleShiftLines('keyArrowUp', payload),
      1,
    ),
    editor.registerCommandListener(
      'keyArrowDown',
      (payload): boolean => handleShiftLines('keyArrowDown', payload),
      1,
    ),
  );
}
