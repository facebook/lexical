/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var Prism = require('prismjs');
require('prismjs/components/prism-clike');
require('prismjs/components/prism-javascript');
require('prismjs/components/prism-markup');
require('prismjs/components/prism-markdown');
require('prismjs/components/prism-c');
require('prismjs/components/prism-css');
require('prismjs/components/prism-objectivec');
require('prismjs/components/prism-sql');
require('prismjs/components/prism-python');
require('prismjs/components/prism-rust');
require('prismjs/components/prism-swift');
require('prismjs/components/prism-typescript');
require('prismjs/components/prism-java');
require('prismjs/components/prism-cpp');
var utils = require('@lexical/utils');
var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const mapToPrismLanguage = language => {
  // eslint-disable-next-line no-prototype-builtins
  return language != null && Prism.languages.hasOwnProperty(language) ? language : undefined;
};
function hasChildDOMNodeTag(node, tagName) {
  for (const child of node.childNodes) {
    if (utils.isHTMLElement(child) && child.tagName === tagName) {
      return true;
    }
    hasChildDOMNodeTag(child, tagName);
  }
  return false;
}
const LANGUAGE_DATA_ATTRIBUTE = 'data-highlight-language';

/** @noInheritDoc */
class CodeNode extends lexical.ElementNode {
  /** @internal */

  static getType() {
    return 'code';
  }
  static clone(node) {
    return new CodeNode(node.__language, node.__key);
  }
  constructor(language, key) {
    super(key);
    this.__language = mapToPrismLanguage(language);
  }

  // View
  createDOM(config) {
    const element = document.createElement('code');
    utils.addClassNamesToElement(element, config.theme.code);
    element.setAttribute('spellcheck', 'false');
    const language = this.getLanguage();
    if (language) {
      element.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language);
    }
    return element;
  }
  updateDOM(prevNode, dom, config) {
    const language = this.__language;
    const prevLanguage = prevNode.__language;
    if (language) {
      if (language !== prevLanguage) {
        dom.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language);
      }
    } else if (prevLanguage) {
      dom.removeAttribute(LANGUAGE_DATA_ATTRIBUTE);
    }
    return false;
  }
  exportDOM() {
    const element = document.createElement('pre');
    element.setAttribute('spellcheck', 'false');
    const language = this.getLanguage();
    if (language) {
      element.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language);
    }
    return {
      element
    };
  }
  static importDOM() {
    return {
      // Typically <pre> is used for code blocks, and <code> for inline code styles
      // but if it's a multi line <code> we'll create a block. Pass through to
      // inline format handled by TextNode otherwise.
      code: node => {
        const isMultiLine = node.textContent != null && (/\r?\n/.test(node.textContent) || hasChildDOMNodeTag(node, 'BR'));
        return isMultiLine ? {
          conversion: convertPreElement,
          priority: 1
        } : null;
      },
      div: node => ({
        conversion: convertDivElement,
        priority: 1
      }),
      pre: node => ({
        conversion: convertPreElement,
        priority: 0
      }),
      table: node => {
        const table = node;
        // domNode is a <table> since we matched it by nodeName
        if (isGitHubCodeTable(table)) {
          return {
            conversion: convertTableElement,
            priority: 3
          };
        }
        return null;
      },
      td: node => {
        // element is a <td> since we matched it by nodeName
        const td = node;
        const table = td.closest('table');
        if (isGitHubCodeCell(td)) {
          return {
            conversion: convertTableCellElement,
            priority: 3
          };
        }
        if (table && isGitHubCodeTable(table)) {
          // Return a no-op if it's a table cell in a code table, but not a code line.
          // Otherwise it'll fall back to the T
          return {
            conversion: convertCodeNoop,
            priority: 3
          };
        }
        return null;
      },
      tr: node => {
        // element is a <tr> since we matched it by nodeName
        const tr = node;
        const table = tr.closest('table');
        if (table && isGitHubCodeTable(table)) {
          return {
            conversion: convertCodeNoop,
            priority: 3
          };
        }
        return null;
      }
    };
  }
  static importJSON(serializedNode) {
    const node = $createCodeNode(serializedNode.language);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      language: this.getLanguage(),
      type: 'code',
      version: 1
    };
  }

  // Mutation
  insertNewAfter(selection, restoreSelection = true) {
    const children = this.getChildren();
    const childrenLength = children.length;
    if (childrenLength >= 2 && children[childrenLength - 1].getTextContent() === '\n' && children[childrenLength - 2].getTextContent() === '\n' && selection.isCollapsed() && selection.anchor.key === this.__key && selection.anchor.offset === childrenLength) {
      children[childrenLength - 1].remove();
      children[childrenLength - 2].remove();
      const newElement = lexical.$createParagraphNode();
      this.insertAfter(newElement, restoreSelection);
      return newElement;
    }

    // If the selection is within the codeblock, find all leading tabs and
    // spaces of the current line. Create a new line that has all those
    // tabs and spaces, such that leading indentation is preserved.
    const anchor = selection.anchor;
    const focus = selection.focus;
    const firstPoint = anchor.isBefore(focus) ? anchor : focus;
    const firstSelectionNode = firstPoint.getNode();
    if ($isCodeHighlightNode(firstSelectionNode) || lexical.$isTabNode(firstSelectionNode)) {
      let node = getFirstCodeNodeOfLine(firstSelectionNode);
      const insertNodes = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (lexical.$isTabNode(node)) {
          insertNodes.push(lexical.$createTabNode());
          node = node.getNextSibling();
        } else if ($isCodeHighlightNode(node)) {
          let spaces = 0;
          const text = node.getTextContent();
          const textSize = node.getTextContentSize();
          for (; spaces < textSize && text[spaces] === ' '; spaces++);
          if (spaces !== 0) {
            insertNodes.push($createCodeHighlightNode(' '.repeat(spaces)));
          }
          if (spaces !== textSize) {
            break;
          }
          node = node.getNextSibling();
        } else {
          break;
        }
      }
      if (insertNodes.length > 0) {
        selection.insertNodes([lexical.$createLineBreakNode(), ...insertNodes]);
        return insertNodes[insertNodes.length - 1];
      }
    }
    return null;
  }
  canIndent() {
    return false;
  }
  collapseAtStart() {
    const paragraph = lexical.$createParagraphNode();
    const children = this.getChildren();
    children.forEach(child => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
  setLanguage(language) {
    const writable = this.getWritable();
    writable.__language = mapToPrismLanguage(language);
  }
  getLanguage() {
    return this.getLatest().__language;
  }
}
function $createCodeNode(language) {
  return lexical.$applyNodeReplacement(new CodeNode(language));
}
function $isCodeNode(node) {
  return node instanceof CodeNode;
}
function convertPreElement(domNode) {
  let language;
  if (utils.isHTMLElement(domNode)) {
    language = domNode.getAttribute(LANGUAGE_DATA_ATTRIBUTE);
  }
  return {
    node: $createCodeNode(language)
  };
}
function convertDivElement(domNode) {
  // domNode is a <div> since we matched it by nodeName
  const div = domNode;
  const isCode = isCodeElement(div);
  if (!isCode && !isCodeChildElement(div)) {
    return {
      node: null
    };
  }
  return {
    after: childLexicalNodes => {
      const domParent = domNode.parentNode;
      if (domParent != null && domNode !== domParent.lastChild) {
        childLexicalNodes.push(lexical.$createLineBreakNode());
      }
      return childLexicalNodes;
    },
    node: isCode ? $createCodeNode() : null
  };
}
function convertTableElement() {
  return {
    node: $createCodeNode()
  };
}
function convertCodeNoop() {
  return {
    node: null
  };
}
function convertTableCellElement(domNode) {
  // domNode is a <td> since we matched it by nodeName
  const cell = domNode;
  return {
    after: childLexicalNodes => {
      if (cell.parentNode && cell.parentNode.nextSibling) {
        // Append newline between code lines
        childLexicalNodes.push(lexical.$createLineBreakNode());
      }
      return childLexicalNodes;
    },
    node: null
  };
}
function isCodeElement(div) {
  return div.style.fontFamily.match('monospace') !== null;
}
function isCodeChildElement(node) {
  let parent = node.parentElement;
  while (parent !== null) {
    if (isCodeElement(parent)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}
function isGitHubCodeCell(cell) {
  return cell.classList.contains('js-file-line');
}
function isGitHubCodeTable(table) {
  return table.classList.contains('js-file-line-container');
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const DEFAULT_CODE_LANGUAGE = 'javascript';
const CODE_LANGUAGE_FRIENDLY_NAME_MAP = {
  c: 'C',
  clike: 'C-like',
  cpp: 'C++',
  css: 'CSS',
  html: 'HTML',
  java: 'Java',
  js: 'JavaScript',
  markdown: 'Markdown',
  objc: 'Objective-C',
  plain: 'Plain Text',
  py: 'Python',
  rust: 'Rust',
  sql: 'SQL',
  swift: 'Swift',
  typescript: 'TypeScript',
  xml: 'XML'
};
const CODE_LANGUAGE_MAP = {
  cpp: 'cpp',
  java: 'java',
  javascript: 'js',
  md: 'markdown',
  plaintext: 'plain',
  python: 'py',
  text: 'plain',
  ts: 'typescript'
};
function normalizeCodeLang(lang) {
  return CODE_LANGUAGE_MAP[lang] || lang;
}
function getLanguageFriendlyName(lang) {
  const _lang = normalizeCodeLang(lang);
  return CODE_LANGUAGE_FRIENDLY_NAME_MAP[_lang] || _lang;
}
const getDefaultCodeLanguage = () => DEFAULT_CODE_LANGUAGE;
const getCodeLanguages = () => Object.keys(Prism.languages).filter(
// Prism has several language helpers mixed into languages object
// so filtering them out here to get langs list
language => typeof Prism.languages[language] !== 'function').sort();

/** @noInheritDoc */
class CodeHighlightNode extends lexical.TextNode {
  /** @internal */

  constructor(text, highlightType, key) {
    super(text, key);
    this.__highlightType = highlightType;
  }
  static getType() {
    return 'code-highlight';
  }
  static clone(node) {
    return new CodeHighlightNode(node.__text, node.__highlightType || undefined, node.__key);
  }
  getHighlightType() {
    const self = this.getLatest();
    return self.__highlightType;
  }
  createDOM(config) {
    const element = super.createDOM(config);
    const className = getHighlightThemeClass(config.theme, this.__highlightType);
    utils.addClassNamesToElement(element, className);
    return element;
  }
  updateDOM(prevNode, dom, config) {
    const update = super.updateDOM(prevNode, dom, config);
    const prevClassName = getHighlightThemeClass(config.theme, prevNode.__highlightType);
    const nextClassName = getHighlightThemeClass(config.theme, this.__highlightType);
    if (prevClassName !== nextClassName) {
      if (prevClassName) {
        utils.removeClassNamesFromElement(dom, prevClassName);
      }
      if (nextClassName) {
        utils.addClassNamesToElement(dom, nextClassName);
      }
    }
    return update;
  }
  static importJSON(serializedNode) {
    const node = $createCodeHighlightNode(serializedNode.text, serializedNode.highlightType);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      highlightType: this.getHighlightType(),
      type: 'code-highlight',
      version: 1
    };
  }

  // Prevent formatting (bold, underline, etc)
  setFormat(format) {
    return this;
  }
  isParentRequired() {
    return true;
  }
  createParentElementNode() {
    return $createCodeNode();
  }
}
function getHighlightThemeClass(theme, highlightType) {
  return highlightType && theme && theme.codeHighlight && theme.codeHighlight[highlightType];
}
function $createCodeHighlightNode(text, highlightType) {
  return lexical.$applyNodeReplacement(new CodeHighlightNode(text, highlightType));
}
function $isCodeHighlightNode(node) {
  return node instanceof CodeHighlightNode;
}
function getFirstCodeNodeOfLine(anchor) {
  let previousNode = anchor;
  let node = anchor;
  while ($isCodeHighlightNode(node) || lexical.$isTabNode(node)) {
    previousNode = node;
    node = node.getPreviousSibling();
  }
  return previousNode;
}
function getLastCodeNodeOfLine(anchor) {
  let nextNode = anchor;
  let node = anchor;
  while ($isCodeHighlightNode(node) || lexical.$isTabNode(node)) {
    nextNode = node;
    node = node.getNextSibling();
  }
  return nextNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const PrismTokenizer = {
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  tokenize(code, language) {
    return Prism.tokenize(code, Prism.languages[language || ''] || Prism.languages[this.defaultLanguage]);
  }
};
function getStartOfCodeInLine(anchor, offset) {
  let last = null;
  let lastNonBlank = null;
  let node = anchor;
  let nodeOffset = offset;
  let nodeTextContent = anchor.getTextContent();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (nodeOffset === 0) {
      node = node.getPreviousSibling();
      if (node === null) {
        break;
      }
      if (!($isCodeHighlightNode(node) || lexical.$isTabNode(node) || lexical.$isLineBreakNode(node))) {
        throw Error(`Expected a valid Code Node: CodeHighlightNode, TabNode, LineBreakNode`);
      }
      if (lexical.$isLineBreakNode(node)) {
        last = {
          node,
          offset: 1
        };
        break;
      }
      nodeOffset = Math.max(0, node.getTextContentSize() - 1);
      nodeTextContent = node.getTextContent();
    } else {
      nodeOffset--;
    }
    const character = nodeTextContent[nodeOffset];
    if ($isCodeHighlightNode(node) && character !== ' ') {
      lastNonBlank = {
        node,
        offset: nodeOffset
      };
    }
  }
  // lastNonBlank !== null: anchor in the middle of code; move to line beginning
  if (lastNonBlank !== null) {
    return lastNonBlank;
  }
  // Spaces, tabs or nothing ahead of anchor
  let codeCharacterAtAnchorOffset = null;
  if (offset < anchor.getTextContentSize()) {
    if ($isCodeHighlightNode(anchor)) {
      codeCharacterAtAnchorOffset = anchor.getTextContent()[offset];
    }
  } else {
    const nextSibling = anchor.getNextSibling();
    if ($isCodeHighlightNode(nextSibling)) {
      codeCharacterAtAnchorOffset = nextSibling.getTextContent()[0];
    }
  }
  if (codeCharacterAtAnchorOffset !== null && codeCharacterAtAnchorOffset !== ' ') {
    // Borderline whitespace and code, move to line beginning
    return last;
  } else {
    const nextNonBlank = findNextNonBlankInLine(anchor, offset);
    if (nextNonBlank !== null) {
      return nextNonBlank;
    } else {
      return last;
    }
  }
}
function findNextNonBlankInLine(anchor, offset) {
  let node = anchor;
  let nodeOffset = offset;
  let nodeTextContent = anchor.getTextContent();
  let nodeTextContentSize = anchor.getTextContentSize();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!$isCodeHighlightNode(node) || nodeOffset === nodeTextContentSize) {
      node = node.getNextSibling();
      if (node === null || lexical.$isLineBreakNode(node)) {
        return null;
      }
      if ($isCodeHighlightNode(node)) {
        nodeOffset = 0;
        nodeTextContent = node.getTextContent();
        nodeTextContentSize = node.getTextContentSize();
      }
    }
    if ($isCodeHighlightNode(node)) {
      if (nodeTextContent[nodeOffset] !== ' ') {
        return {
          node,
          offset: nodeOffset
        };
      }
      nodeOffset++;
    }
  }
}
function getEndOfCodeInLine(anchor) {
  const lastNode = getLastCodeNodeOfLine(anchor);
  if (!!lexical.$isLineBreakNode(lastNode)) {
    throw Error(`Unexpected lineBreakNode in getEndOfCodeInLine`);
  }
  return lastNode;
}
function textNodeTransform(node, editor, tokenizer) {
  // Since CodeNode has flat children structure we only need to check
  // if node's parent is a code node and run highlighting if so
  const parentNode = node.getParent();
  if ($isCodeNode(parentNode)) {
    codeNodeTransform(parentNode, editor, tokenizer);
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace(lexical.$createTextNode(node.__text));
  }
}
function updateCodeGutter(node, editor) {
  const codeElement = editor.getElementByKey(node.getKey());
  if (codeElement === null) {
    return;
  }
  const children = node.getChildren();
  const childrenLength = children.length;
  // @ts-ignore: internal field
  if (childrenLength === codeElement.__cachedChildrenLength) {
    // Avoid updating the attribute if the children length hasn't changed.
    return;
  }
  // @ts-ignore:: internal field
  codeElement.__cachedChildrenLength = childrenLength;
  let gutter = '1';
  let count = 1;
  for (let i = 0; i < childrenLength; i++) {
    if (lexical.$isLineBreakNode(children[i])) {
      gutter += '\n' + ++count;
    }
  }
  codeElement.setAttribute('data-gutter', gutter);
}

// Using `skipTransforms` to prevent extra transforms since reformatting the code
// will not affect code block content itself.
//
// Using extra cache (`nodesCurrentlyHighlighting`) since both CodeNode and CodeHighlightNode
// transforms might be called at the same time (e.g. new CodeHighlight node inserted) and
// in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
// Especially when pasting code into CodeBlock.

const nodesCurrentlyHighlighting = new Set();
function codeNodeTransform(node, editor, tokenizer) {
  const nodeKey = node.getKey();
  if (nodesCurrentlyHighlighting.has(nodeKey)) {
    return;
  }
  nodesCurrentlyHighlighting.add(nodeKey);

  // When new code block inserted it might not have language selected
  if (node.getLanguage() === undefined) {
    node.setLanguage(tokenizer.defaultLanguage);
  }

  // Using nested update call to pass `skipTransforms` since we don't want
  // each individual codehighlight node to be transformed again as it's already
  // in its final state
  editor.update(() => {
    updateAndRetainSelection(nodeKey, () => {
      const currentNode = lexical.$getNodeByKey(nodeKey);
      if (!$isCodeNode(currentNode) || !currentNode.isAttached()) {
        return false;
      }
      const code = currentNode.getTextContent();
      const tokens = tokenizer.tokenize(code, currentNode.getLanguage() || tokenizer.defaultLanguage);
      const highlightNodes = getHighlightNodes(tokens);
      const diffRange = getDiffRange(currentNode.getChildren(), highlightNodes);
      const {
        from,
        to,
        nodesForReplacement
      } = diffRange;
      if (from !== to || nodesForReplacement.length) {
        node.splice(from, to - from, nodesForReplacement);
        return true;
      }
      return false;
    });
  }, {
    onUpdate: () => {
      nodesCurrentlyHighlighting.delete(nodeKey);
    },
    skipTransforms: true
  });
}
function getHighlightNodes(tokens, type) {
  const nodes = [];
  for (const token of tokens) {
    if (typeof token === 'string') {
      const partials = token.split(/(\n|\t)/);
      const partialsLength = partials.length;
      for (let i = 0; i < partialsLength; i++) {
        const part = partials[i];
        if (part === '\n' || part === '\r\n') {
          nodes.push(lexical.$createLineBreakNode());
        } else if (part === '\t') {
          nodes.push(lexical.$createTabNode());
        } else if (part.length > 0) {
          nodes.push($createCodeHighlightNode(part, type));
        }
      }
    } else {
      const {
        content
      } = token;
      if (typeof content === 'string') {
        nodes.push(...getHighlightNodes([content], token.type));
      } else if (Array.isArray(content)) {
        nodes.push(...getHighlightNodes(content, token.type));
      }
    }
  }
  return nodes;
}

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function updateAndRetainSelection(nodeKey, updateFn) {
  const node = lexical.$getNodeByKey(nodeKey);
  if (!$isCodeNode(node) || !node.isAttached()) {
    return;
  }
  const selection = lexical.$getSelection();
  // If it's not range selection (or null selection) there's no need to change it,
  // but we can still run highlighting logic
  if (!lexical.$isRangeSelection(selection)) {
    updateFn();
    return;
  }
  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const isNewLineAnchor = anchor.type === 'element' && lexical.$isLineBreakNode(node.getChildAtIndex(anchor.offset - 1));
  let textOffset = 0;

  // Calculating previous text offset (all text node prior to anchor + anchor own text offset)
  if (!isNewLineAnchor) {
    const anchorNode = anchor.getNode();
    textOffset = anchorOffset + anchorNode.getPreviousSiblings().reduce((offset, _node) => {
      return offset + _node.getTextContentSize();
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
  node.getChildren().some(_node => {
    const isText = lexical.$isTextNode(_node);
    if (isText || lexical.$isLineBreakNode(_node)) {
      const textContentSize = _node.getTextContentSize();
      if (isText && textContentSize >= textOffset) {
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
function getDiffRange(prevNodes, nextNodes) {
  let leadingMatch = 0;
  while (leadingMatch < prevNodes.length) {
    if (!isEqual(prevNodes[leadingMatch], nextNodes[leadingMatch])) {
      break;
    }
    leadingMatch++;
  }
  const prevNodesLength = prevNodes.length;
  const nextNodesLength = nextNodes.length;
  const maxTrailingMatch = Math.min(prevNodesLength, nextNodesLength) - leadingMatch;
  let trailingMatch = 0;
  while (trailingMatch < maxTrailingMatch) {
    trailingMatch++;
    if (!isEqual(prevNodes[prevNodesLength - trailingMatch], nextNodes[nextNodesLength - trailingMatch])) {
      trailingMatch--;
      break;
    }
  }
  const from = leadingMatch;
  const to = prevNodesLength - trailingMatch;
  const nodesForReplacement = nextNodes.slice(leadingMatch, nextNodesLength - trailingMatch);
  return {
    from,
    nodesForReplacement,
    to
  };
}
function isEqual(nodeA, nodeB) {
  // Only checking for code higlight nodes, tabs and linebreaks. If it's regular text node
  // returning false so that it's transformed into code highlight node
  return $isCodeHighlightNode(nodeA) && $isCodeHighlightNode(nodeB) && nodeA.__text === nodeB.__text && nodeA.__highlightType === nodeB.__highlightType || lexical.$isTabNode(nodeA) && lexical.$isTabNode(nodeB) || lexical.$isLineBreakNode(nodeA) && lexical.$isLineBreakNode(nodeB);
}
function $isSelectionInCode(selection) {
  if (!lexical.$isRangeSelection(selection)) {
    return false;
  }
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode.is(focusNode) && $isCodeNode(anchorNode)) {
    return true;
  }
  const anchorParent = anchorNode.getParent();
  return $isCodeNode(anchorParent) && anchorParent.is(focusNode.getParent());
}
function $getCodeLines(selection) {
  const nodes = selection.getNodes();
  const lines = [[]];
  if (nodes.length === 1 && $isCodeNode(nodes[0])) {
    return lines;
  }
  let lastLine = lines[0];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!($isCodeHighlightNode(node) || lexical.$isTabNode(node) || lexical.$isLineBreakNode(node))) {
      throw Error(`Expected selection to be inside CodeBlock and consisting of CodeHighlightNode, TabNode and LineBreakNode`);
    }
    if (lexical.$isLineBreakNode(node)) {
      if (i !== 0 && lastLine.length > 0) {
        lastLine = [];
        lines.push(lastLine);
      }
    } else {
      lastLine.push(node);
    }
  }
  return lines;
}
function handleTab(shiftKey) {
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !$isSelectionInCode(selection)) {
    return null;
  }
  const indentOrOutdent = !shiftKey ? lexical.INDENT_CONTENT_COMMAND : lexical.OUTDENT_CONTENT_COMMAND;
  const tabOrOutdent = !shiftKey ? lexical.INSERT_TAB_COMMAND : lexical.OUTDENT_CONTENT_COMMAND;
  // 1. If multiple lines selected: indent/outdent
  const codeLines = $getCodeLines(selection);
  if (codeLines.length > 1) {
    return indentOrOutdent;
  }
  // 2. If entire line selected: indent/outdent
  const selectionNodes = selection.getNodes();
  const firstNode = selectionNodes[0];
  if (!($isCodeNode(firstNode) || $isCodeHighlightNode(firstNode) || lexical.$isTabNode(firstNode) || lexical.$isLineBreakNode(firstNode))) {
    throw Error(`Expected selection firstNode to be CodeHighlightNode or TabNode`);
  }
  if ($isCodeNode(firstNode)) {
    return indentOrOutdent;
  }
  const firstOfLine = getFirstCodeNodeOfLine(firstNode);
  const lastOfLine = getLastCodeNodeOfLine(firstNode);
  const anchor = selection.anchor;
  const focus = selection.focus;
  let selectionFirst;
  let selectionLast;
  if (focus.isBefore(anchor)) {
    selectionFirst = focus;
    selectionLast = anchor;
  } else {
    selectionFirst = anchor;
    selectionLast = focus;
  }
  if (firstOfLine !== null && lastOfLine !== null && selectionFirst.key === firstOfLine.getKey() && selectionFirst.offset === 0 && selectionLast.key === lastOfLine.getKey() && selectionLast.offset === lastOfLine.getTextContentSize()) {
    return indentOrOutdent;
  }
  // 3. Else: tab/outdent
  return tabOrOutdent;
}
function handleMultilineIndent(type) {
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !$isSelectionInCode(selection)) {
    return false;
  }
  const codeLines = $getCodeLines(selection);
  const codeLinesLength = codeLines.length;
  // Multiple lines selection
  if (codeLines.length > 1) {
    for (let i = 0; i < codeLinesLength; i++) {
      const line = codeLines[i];
      if (line.length > 0) {
        let firstOfLine = line[0];
        // First and last lines might not be complete
        if (i === 0) {
          firstOfLine = getFirstCodeNodeOfLine(firstOfLine);
        }
        if (firstOfLine !== null) {
          if (type === lexical.INDENT_CONTENT_COMMAND) {
            firstOfLine.insertBefore(lexical.$createTabNode());
          } else if (lexical.$isTabNode(firstOfLine)) {
            firstOfLine.remove();
          }
        }
      }
    }
    return true;
  }
  // Just one line
  const selectionNodes = selection.getNodes();
  const firstNode = selectionNodes[0];
  if (!($isCodeNode(firstNode) || $isCodeHighlightNode(firstNode) || lexical.$isTabNode(firstNode) || lexical.$isLineBreakNode(firstNode))) {
    throw Error(`Expected selection firstNode to be CodeHighlightNode or CodeTabNode`);
  }
  if ($isCodeNode(firstNode)) {
    // CodeNode is empty
    if (type === lexical.INDENT_CONTENT_COMMAND) {
      selection.insertNodes([lexical.$createTabNode()]);
    }
    return true;
  }
  const firstOfLine = getFirstCodeNodeOfLine(firstNode);
  if (!(firstOfLine !== null)) {
    throw Error(`Expected getFirstCodeNodeOfLine to return a valid Code Node`);
  }
  if (type === lexical.INDENT_CONTENT_COMMAND) {
    if (lexical.$isLineBreakNode(firstOfLine)) {
      firstOfLine.insertAfter(lexical.$createTabNode());
    } else {
      firstOfLine.insertBefore(lexical.$createTabNode());
    }
  } else if (lexical.$isTabNode(firstOfLine)) {
    firstOfLine.remove();
  }
  return true;
}
function handleShiftLines(type, event) {
  // We only care about the alt+arrow keys
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection)) {
    return false;
  }

  // I'm not quite sure why, but it seems like calling anchor.getNode() collapses the selection here
  // So first, get the anchor and the focus, then get their nodes
  const {
    anchor,
    focus
  } = selection;
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const arrowIsUp = type === lexical.KEY_ARROW_UP_COMMAND;

  // Ensure the selection is within the codeblock
  if (!$isSelectionInCode(selection) || !($isCodeHighlightNode(anchorNode) || lexical.$isTabNode(anchorNode)) || !($isCodeHighlightNode(focusNode) || lexical.$isTabNode(focusNode))) {
    return false;
  }
  if (!event.altKey) {
    // Handle moving selection out of the code block, given there are no
    // sibling thats can natively take the selection.
    if (selection.isCollapsed()) {
      const codeNode = anchorNode.getParentOrThrow();
      if (arrowIsUp && anchorOffset === 0 && anchorNode.getPreviousSibling() === null) {
        const codeNodeSibling = codeNode.getPreviousSibling();
        if (codeNodeSibling === null) {
          codeNode.selectPrevious();
          event.preventDefault();
          return true;
        }
      } else if (!arrowIsUp && anchorOffset === anchorNode.getTextContentSize() && anchorNode.getNextSibling() === null) {
        const codeNodeSibling = codeNode.getNextSibling();
        if (codeNodeSibling === null) {
          codeNode.selectNext();
          event.preventDefault();
          return true;
        }
      }
    }
    return false;
  }
  let start;
  let end;
  if (anchorNode.isBefore(focusNode)) {
    start = getFirstCodeNodeOfLine(anchorNode);
    end = getLastCodeNodeOfLine(focusNode);
  } else {
    start = getFirstCodeNodeOfLine(focusNode);
    end = getLastCodeNodeOfLine(anchorNode);
  }
  if (start == null || end == null) {
    return false;
  }
  const range = start.getNodesBetween(end);
  for (let i = 0; i < range.length; i++) {
    const node = range[i];
    if (!$isCodeHighlightNode(node) && !lexical.$isTabNode(node) && !lexical.$isLineBreakNode(node)) {
      return false;
    }
  }

  // After this point, we know the selection is within the codeblock. We may not be able to
  // actually move the lines around, but we want to return true either way to prevent
  // the event's default behavior
  event.preventDefault();
  event.stopPropagation(); // required to stop cursor movement under Firefox

  const linebreak = arrowIsUp ? start.getPreviousSibling() : end.getNextSibling();
  if (!lexical.$isLineBreakNode(linebreak)) {
    return true;
  }
  const sibling = arrowIsUp ? linebreak.getPreviousSibling() : linebreak.getNextSibling();
  if (sibling == null) {
    return true;
  }
  const maybeInsertionPoint = $isCodeHighlightNode(sibling) || lexical.$isTabNode(sibling) || lexical.$isLineBreakNode(sibling) ? arrowIsUp ? getFirstCodeNodeOfLine(sibling) : getLastCodeNodeOfLine(sibling) : null;
  let insertionPoint = maybeInsertionPoint != null ? maybeInsertionPoint : sibling;
  linebreak.remove();
  range.forEach(node => node.remove());
  if (type === lexical.KEY_ARROW_UP_COMMAND) {
    range.forEach(node => insertionPoint.insertBefore(node));
    insertionPoint.insertBefore(linebreak);
  } else {
    insertionPoint.insertAfter(linebreak);
    insertionPoint = linebreak;
    range.forEach(node => {
      insertionPoint.insertAfter(node);
      insertionPoint = node;
    });
  }
  selection.setTextNodeRange(anchorNode, anchorOffset, focusNode, focusOffset);
  return true;
}
function handleMoveTo(type, event) {
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection)) {
    return false;
  }
  const {
    anchor,
    focus
  } = selection;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const isMoveToStart = type === lexical.MOVE_TO_START;
  if (!($isCodeHighlightNode(anchorNode) || lexical.$isTabNode(anchorNode)) || !($isCodeHighlightNode(focusNode) || lexical.$isTabNode(focusNode))) {
    return false;
  }
  if (isMoveToStart) {
    const start = getStartOfCodeInLine(focusNode, focus.offset);
    if (start !== null) {
      const {
        node,
        offset
      } = start;
      if (lexical.$isLineBreakNode(node)) {
        node.selectNext(0, 0);
      } else {
        selection.setTextNodeRange(node, offset, node, offset);
      }
    } else {
      focusNode.getParentOrThrow().selectStart();
    }
  } else {
    const node = getEndOfCodeInLine(focusNode);
    node.select();
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
}
function registerCodeHighlighting(editor, tokenizer) {
  if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    throw new Error('CodeHighlightPlugin: CodeNode or CodeHighlightNode not registered on editor');
  }
  if (tokenizer == null) {
    tokenizer = PrismTokenizer;
  }
  return utils.mergeRegister(editor.registerMutationListener(CodeNode, mutations => {
    editor.update(() => {
      for (const [key, type] of mutations) {
        if (type !== 'destroyed') {
          const node = lexical.$getNodeByKey(key);
          if (node !== null) {
            updateCodeGutter(node, editor);
          }
        }
      }
    });
  }), editor.registerNodeTransform(CodeNode, node => codeNodeTransform(node, editor, tokenizer)), editor.registerNodeTransform(lexical.TextNode, node => textNodeTransform(node, editor, tokenizer)), editor.registerNodeTransform(CodeHighlightNode, node => textNodeTransform(node, editor, tokenizer)), editor.registerCommand(lexical.KEY_TAB_COMMAND, event => {
    const command = handleTab(event.shiftKey);
    if (command === null) {
      return false;
    }
    event.preventDefault();
    editor.dispatchCommand(command, undefined);
    return true;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.INSERT_TAB_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!$isSelectionInCode(selection)) {
      return false;
    }
    lexical.$insertNodes([lexical.$createTabNode()]);
    return true;
  }, lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.INDENT_CONTENT_COMMAND, payload => handleMultilineIndent(lexical.INDENT_CONTENT_COMMAND), lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.OUTDENT_CONTENT_COMMAND, payload => handleMultilineIndent(lexical.OUTDENT_CONTENT_COMMAND), lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_UP_COMMAND, payload => handleShiftLines(lexical.KEY_ARROW_UP_COMMAND, payload), lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.KEY_ARROW_DOWN_COMMAND, payload => handleShiftLines(lexical.KEY_ARROW_DOWN_COMMAND, payload), lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.MOVE_TO_END, payload => handleMoveTo(lexical.MOVE_TO_END, payload), lexical.COMMAND_PRIORITY_LOW), editor.registerCommand(lexical.MOVE_TO_START, payload => handleMoveTo(lexical.MOVE_TO_START, payload), lexical.COMMAND_PRIORITY_LOW));
}

exports.$createCodeHighlightNode = $createCodeHighlightNode;
exports.$createCodeNode = $createCodeNode;
exports.$isCodeHighlightNode = $isCodeHighlightNode;
exports.$isCodeNode = $isCodeNode;
exports.CODE_LANGUAGE_FRIENDLY_NAME_MAP = CODE_LANGUAGE_FRIENDLY_NAME_MAP;
exports.CODE_LANGUAGE_MAP = CODE_LANGUAGE_MAP;
exports.CodeHighlightNode = CodeHighlightNode;
exports.CodeNode = CodeNode;
exports.DEFAULT_CODE_LANGUAGE = DEFAULT_CODE_LANGUAGE;
exports.PrismTokenizer = PrismTokenizer;
exports.getCodeLanguages = getCodeLanguages;
exports.getDefaultCodeLanguage = getDefaultCodeLanguage;
exports.getEndOfCodeInLine = getEndOfCodeInLine;
exports.getFirstCodeNodeOfLine = getFirstCodeNodeOfLine;
exports.getLanguageFriendlyName = getLanguageFriendlyName;
exports.getLastCodeNodeOfLine = getLastCodeNodeOfLine;
exports.getStartOfCodeInLine = getStartOfCodeInLine;
exports.normalizeCodeLang = normalizeCodeLang;
exports.registerCodeHighlighting = registerCodeHighlighting;
