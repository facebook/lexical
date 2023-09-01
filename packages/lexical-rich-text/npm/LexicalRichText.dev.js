/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var clipboard = require('@lexical/clipboard');
var selection = require('@lexical/selection');
var utils = require('@lexical/utils');
var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function caretFromPoint(x, y) {
  if (typeof document.caretRangeFromPoint !== 'undefined') {
    const range = document.caretRangeFromPoint(x, y);
    if (range === null) {
      return null;
    }
    return {
      node: range.startContainer,
      offset: range.startOffset
    };
    // @ts-ignore
  } else if (document.caretPositionFromPoint !== 'undefined') {
    // @ts-ignore FF - no types
    const range = document.caretPositionFromPoint(x, y);
    if (range === null) {
      return null;
    }
    return {
      node: range.offsetNode,
      offset: range.offset
    };
  } else {
    // Gracefully handle IE
    return null;
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const documentMode = CAN_USE_DOM && 'documentMode' in document ? document.documentMode : null;
CAN_USE_DOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
CAN_USE_DOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
const CAN_USE_BEFORE_INPUT = CAN_USE_DOM && 'InputEvent' in window && !documentMode ? 'getTargetRanges' in new window.InputEvent('input') : false;
const IS_SAFARI = CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
const IS_IOS = CAN_USE_DOM && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Keep these in case we need to use them in the future.
// export const IS_WINDOWS: boolean = CAN_USE_DOM && /Win/.test(navigator.platform);
const IS_CHROME = CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent: boolean = CAN_USE_DOM && 'TextEvent' in window && !documentMode;

const IS_APPLE_WEBKIT = CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !IS_CHROME;

/** @module @lexical/rich-text */
const DRAG_DROP_PASTE = lexical.createCommand('DRAG_DROP_PASTE_FILE');
/** @noInheritDoc */
class QuoteNode extends lexical.ElementNode {
  static getType() {
    return 'quote';
  }
  static clone(node) {
    return new QuoteNode(node.__key);
  }
  constructor(key) {
    super(key);
  }

  // View

  createDOM(config) {
    const element = document.createElement('blockquote');
    utils.addClassNamesToElement(element, config.theme.quote);
    return element;
  }
  updateDOM(prevNode, dom) {
    return false;
  }
  static importDOM() {
    return {
      blockquote: node => ({
        conversion: convertBlockquoteElement,
        priority: 0
      })
    };
  }
  exportDOM(editor) {
    const {
      element
    } = super.exportDOM(editor);
    if (element && utils.isHTMLElement(element)) {
      if (this.isEmpty()) element.append(document.createElement('br'));
      const formatType = this.getFormatType();
      element.style.textAlign = formatType;
      const direction = this.getDirection();
      if (direction) {
        element.dir = direction;
      }
    }
    return {
      element
    };
  }
  static importJSON(serializedNode) {
    const node = $createQuoteNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'quote'
    };
  }

  // Mutation

  insertNewAfter(_, restoreSelection) {
    const newBlock = lexical.$createParagraphNode();
    const direction = this.getDirection();
    newBlock.setDirection(direction);
    this.insertAfter(newBlock, restoreSelection);
    return newBlock;
  }
  collapseAtStart() {
    const paragraph = lexical.$createParagraphNode();
    const children = this.getChildren();
    children.forEach(child => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}
function $createQuoteNode() {
  return lexical.$applyNodeReplacement(new QuoteNode());
}
function $isQuoteNode(node) {
  return node instanceof QuoteNode;
}
/** @noInheritDoc */
class HeadingNode extends lexical.ElementNode {
  /** @internal */

  static getType() {
    return 'heading';
  }
  static clone(node) {
    return new HeadingNode(node.__tag, node.__key);
  }
  constructor(tag, key) {
    super(key);
    this.__tag = tag;
  }
  getTag() {
    return this.__tag;
  }

  // View

  createDOM(config) {
    const tag = this.__tag;
    const element = document.createElement(tag);
    const theme = config.theme;
    const classNames = theme.heading;
    if (classNames !== undefined) {
      const className = classNames[tag];
      utils.addClassNamesToElement(element, className);
    }
    return element;
  }
  updateDOM(prevNode, dom) {
    return false;
  }
  static importDOM() {
    return {
      h1: node => ({
        conversion: convertHeadingElement,
        priority: 0
      }),
      h2: node => ({
        conversion: convertHeadingElement,
        priority: 0
      }),
      h3: node => ({
        conversion: convertHeadingElement,
        priority: 0
      }),
      h4: node => ({
        conversion: convertHeadingElement,
        priority: 0
      }),
      h5: node => ({
        conversion: convertHeadingElement,
        priority: 0
      }),
      h6: node => ({
        conversion: convertHeadingElement,
        priority: 0
      }),
      p: node => {
        // domNode is a <p> since we matched it by nodeName
        const paragraph = node;
        const firstChild = paragraph.firstChild;
        if (firstChild !== null && isGoogleDocsTitle(firstChild)) {
          return {
            conversion: () => ({
              node: null
            }),
            priority: 3
          };
        }
        return null;
      },
      span: node => {
        if (isGoogleDocsTitle(node)) {
          return {
            conversion: domNode => {
              return {
                node: $createHeadingNode('h1')
              };
            },
            priority: 3
          };
        }
        return null;
      }
    };
  }
  exportDOM(editor) {
    const {
      element
    } = super.exportDOM(editor);
    if (element && utils.isHTMLElement(element)) {
      if (this.isEmpty()) element.append(document.createElement('br'));
      const formatType = this.getFormatType();
      element.style.textAlign = formatType;
      const direction = this.getDirection();
      if (direction) {
        element.dir = direction;
      }
    }
    return {
      element
    };
  }
  static importJSON(serializedNode) {
    const node = $createHeadingNode(serializedNode.tag);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      tag: this.getTag(),
      type: 'heading',
      version: 1
    };
  }

  // Mutation
  insertNewAfter(selection, restoreSelection = true) {
    const anchorOffet = selection ? selection.anchor.offset : 0;
    const newElement = anchorOffet > 0 && anchorOffet < this.getTextContentSize() ? $createHeadingNode(this.getTag()) : lexical.$createParagraphNode();
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }
  collapseAtStart() {
    const newElement = !this.isEmpty() ? $createHeadingNode(this.getTag()) : lexical.$createParagraphNode();
    const children = this.getChildren();
    children.forEach(child => newElement.append(child));
    this.replace(newElement);
    return true;
  }
  extractWithChild() {
    return true;
  }
}
function isGoogleDocsTitle(domNode) {
  if (domNode.nodeName.toLowerCase() === 'span') {
    return domNode.style.fontSize === '26pt';
  }
  return false;
}
function convertHeadingElement(element) {
  const nodeName = element.nodeName.toLowerCase();
  let node = null;
  if (nodeName === 'h1' || nodeName === 'h2' || nodeName === 'h3' || nodeName === 'h4' || nodeName === 'h5' || nodeName === 'h6') {
    node = $createHeadingNode(nodeName);
    if (element.style !== null) {
      node.setFormat(element.style.textAlign);
    }
  }
  return {
    node
  };
}
function convertBlockquoteElement(element) {
  const node = $createQuoteNode();
  if (element.style !== null) {
    node.setFormat(element.style.textAlign);
  }
  return {
    node
  };
}
function $createHeadingNode(headingTag) {
  return lexical.$applyNodeReplacement(new HeadingNode(headingTag));
}
function $isHeadingNode(node) {
  return node instanceof HeadingNode;
}
function onPasteForRichText(event, editor) {
  event.preventDefault();
  editor.update(() => {
    const selection = lexical.$getSelection();
    const clipboardData = event instanceof InputEvent || event instanceof KeyboardEvent ? null : event.clipboardData;
    if (clipboardData != null && (lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection))) {
      clipboard.$insertDataTransferForRichText(clipboardData, selection, editor);
    }
  }, {
    tag: 'paste'
  });
}
async function onCutForRichText(event, editor) {
  await clipboard.copyToClipboard(editor, utils.objectKlassEquals(event, ClipboardEvent) ? event : null);
  editor.update(() => {
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection)) {
      selection.removeText();
    } else if (lexical.$isNodeSelection(selection)) {
      selection.getNodes().forEach(node => node.remove());
    }
  });
}

// Clipboard may contain files that we aren't allowed to read. While the event is arguably useless,
// in certain ocassions, we want to know whether it was a file transfer, as opposed to text. We
// control this with the first boolean flag.
function eventFiles(event) {
  let dataTransfer = null;
  if (event instanceof DragEvent) {
    dataTransfer = event.dataTransfer;
  } else if (event instanceof ClipboardEvent) {
    dataTransfer = event.clipboardData;
  }
  if (dataTransfer === null) {
    return [false, [], false];
  }
  const types = dataTransfer.types;
  const hasFiles = types.includes('Files');
  const hasContent = types.includes('text/html') || types.includes('text/plain');
  return [hasFiles, Array.from(dataTransfer.files), hasContent];
}
function handleIndentAndOutdent(indentOrOutdent) {
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection)) {
    return false;
  }
  const alreadyHandled = new Set();
  const nodes = selection.getNodes();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const key = node.getKey();
    if (alreadyHandled.has(key)) {
      continue;
    }
    const parentBlock = utils.$getNearestBlockElementAncestorOrThrow(node);
    const parentKey = parentBlock.getKey();
    if (parentBlock.canIndent() && !alreadyHandled.has(parentKey)) {
      alreadyHandled.add(parentKey);
      indentOrOutdent(parentBlock);
    }
  }
  return alreadyHandled.size > 0;
}
function $isTargetWithinDecorator(target) {
  const node = lexical.$getNearestNodeFromDOMNode(target);
  return lexical.$isDecoratorNode(node);
}
function $isSelectionAtEndOfRoot(selection) {
  const focus = selection.focus;
  return focus.key === 'root' && focus.offset === lexical.$getRoot().getChildrenSize();
}
function registerRichText(editor) {
  const removeListener = utils.mergeRegister(editor.registerCommand(lexical.CLICK_COMMAND, payload => {
    const selection = lexical.$getSelection();
    if (lexical.$isNodeSelection(selection)) {
      selection.clear();
      return true;
    }
    return false;
  }, 0), editor.registerCommand(lexical.DELETE_CHARACTER_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteCharacter(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DELETE_WORD_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteWord(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DELETE_LINE_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteLine(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, eventOrText => {
    const selection = lexical.$getSelection();
    if (typeof eventOrText === 'string') {
      if (lexical.$isRangeSelection(selection)) {
        selection.insertText(eventOrText);
      } else if (lexical.DEPRECATED_$isGridSelection(selection)) ;
    } else {
      if (!lexical.$isRangeSelection(selection) && !lexical.DEPRECATED_$isGridSelection(selection)) {
        return false;
      }
      const dataTransfer = eventOrText.dataTransfer;
      if (dataTransfer != null) {
        clipboard.$insertDataTransferForRichText(dataTransfer, selection, editor);
      } else if (lexical.$isRangeSelection(selection)) {
        const data = eventOrText.data;
        if (data) {
          selection.insertText(data);
        }
        return true;
      }
    }
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.REMOVE_TEXT_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.removeText();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.FORMAT_TEXT_COMMAND, format => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.formatText(format);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.FORMAT_ELEMENT_COMMAND, format => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection) && !lexical.$isNodeSelection(selection)) {
      return false;
    }
    const nodes = selection.getNodes();
    for (const node of nodes) {
      const element = utils.$findMatchingParent(node, parentNode => lexical.$isElementNode(parentNode) && !parentNode.isInline());
      if (element !== null) {
        element.setFormat(format);
      }
    }
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INSERT_LINE_BREAK_COMMAND, selectStart => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.insertLineBreak(selectStart);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.insertParagraph();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INSERT_TAB_COMMAND, () => {
    lexical.$insertNodes([lexical.$createTabNode()]);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INDENT_CONTENT_COMMAND, () => {
    return handleIndentAndOutdent(block => {
      const indent = block.getIndent();
      block.setIndent(indent + 1);
    });
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.OUTDENT_CONTENT_COMMAND, () => {
    return handleIndentAndOutdent(block => {
      const indent = block.getIndent();
      if (indent > 0) {
        block.setIndent(indent - 1);
      }
    });
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_UP_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (lexical.$isNodeSelection(selection) && !$isTargetWithinDecorator(event.target)) {
      // If selection is on a node, let's try and move selection
      // back to being a range selection.
      const nodes = selection.getNodes();
      if (nodes.length > 0) {
        nodes[0].selectPrevious();
        return true;
      }
    } else if (lexical.$isRangeSelection(selection)) {
      const possibleNode = lexical.$getAdjacentNode(selection.focus, true);
      if (!event.shiftKey && lexical.$isDecoratorNode(possibleNode) && !possibleNode.isIsolated() && !possibleNode.isInline()) {
        possibleNode.selectPrevious();
        event.preventDefault();
        return true;
      }
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_DOWN_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (lexical.$isNodeSelection(selection)) {
      // If selection is on a node, let's try and move selection
      // back to being a range selection.
      const nodes = selection.getNodes();
      if (nodes.length > 0) {
        nodes[0].selectNext(0, 0);
        return true;
      }
    } else if (lexical.$isRangeSelection(selection)) {
      if ($isSelectionAtEndOfRoot(selection)) {
        event.preventDefault();
        return true;
      }
      const possibleNode = lexical.$getAdjacentNode(selection.focus, false);
      if (!event.shiftKey && lexical.$isDecoratorNode(possibleNode) && !possibleNode.isIsolated() && !possibleNode.isInline()) {
        possibleNode.selectNext();
        event.preventDefault();
        return true;
      }
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_LEFT_COMMAND, event => {
    const selection$1 = lexical.$getSelection();
    if (lexical.$isNodeSelection(selection$1)) {
      // If selection is on a node, let's try and move selection
      // back to being a range selection.
      const nodes = selection$1.getNodes();
      if (nodes.length > 0) {
        event.preventDefault();
        nodes[0].selectPrevious();
        return true;
      }
    }
    if (!lexical.$isRangeSelection(selection$1)) {
      return false;
    }
    if (selection.$shouldOverrideDefaultCharacterSelection(selection$1, true)) {
      const isHoldingShift = event.shiftKey;
      event.preventDefault();
      selection.$moveCharacter(selection$1, isHoldingShift, true);
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_RIGHT_COMMAND, event => {
    const selection$1 = lexical.$getSelection();
    if (lexical.$isNodeSelection(selection$1) && !$isTargetWithinDecorator(event.target)) {
      // If selection is on a node, let's try and move selection
      // back to being a range selection.
      const nodes = selection$1.getNodes();
      if (nodes.length > 0) {
        event.preventDefault();
        nodes[0].selectNext(0, 0);
        return true;
      }
    }
    if (!lexical.$isRangeSelection(selection$1)) {
      return false;
    }
    const isHoldingShift = event.shiftKey;
    if (selection.$shouldOverrideDefaultCharacterSelection(selection$1, false)) {
      event.preventDefault();
      selection.$moveCharacter(selection$1, isHoldingShift, false);
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, event => {
    if ($isTargetWithinDecorator(event.target)) {
      return false;
    }
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    event.preventDefault();
    const {
      anchor
    } = selection;
    const anchorNode = anchor.getNode();
    if (selection.isCollapsed() && anchor.offset === 0 && !lexical.$isRootNode(anchorNode)) {
      const element = utils.$getNearestBlockElementAncestorOrThrow(anchorNode);
      if (element.getIndent() > 0) {
        return editor.dispatchCommand(lexical.OUTDENT_CONTENT_COMMAND, undefined);
      }
    }
    return editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, true);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_DELETE_COMMAND, event => {
    if ($isTargetWithinDecorator(event.target)) {
      return false;
    }
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    event.preventDefault();
    return editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, false);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ENTER_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    if (event !== null) {
      // If we have beforeinput, then we can avoid blocking
      // the default behavior. This ensures that the iOS can
      // intercept that we're actually inserting a paragraph,
      // and autocomplete, autocapitalize etc work as intended.
      // This can also cause a strange performance issue in
      // Safari, where there is a noticeable pause due to
      // preventing the key down of enter.
      if ((IS_IOS || IS_SAFARI || IS_APPLE_WEBKIT) && CAN_USE_BEFORE_INPUT) {
        return false;
      }
      event.preventDefault();
      if (event.shiftKey) {
        return editor.dispatchCommand(lexical.INSERT_LINE_BREAK_COMMAND, false);
      }
    }
    return editor.dispatchCommand(lexical.INSERT_PARAGRAPH_COMMAND, undefined);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ESCAPE_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    editor.blur();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DROP_COMMAND, event => {
    const [, files] = eventFiles(event);
    if (files.length > 0) {
      const x = event.clientX;
      const y = event.clientY;
      const eventRange = caretFromPoint(x, y);
      if (eventRange !== null) {
        const {
          offset: domOffset,
          node: domNode
        } = eventRange;
        const node = lexical.$getNearestNodeFromDOMNode(domNode);
        if (node !== null) {
          const selection = lexical.$createRangeSelection();
          if (lexical.$isTextNode(node)) {
            selection.anchor.set(node.getKey(), domOffset, 'text');
            selection.focus.set(node.getKey(), domOffset, 'text');
          } else {
            const parentKey = node.getParentOrThrow().getKey();
            const offset = node.getIndexWithinParent() + 1;
            selection.anchor.set(parentKey, offset, 'element');
            selection.focus.set(parentKey, offset, 'element');
          }
          const normalizedSelection = lexical.$normalizeSelection__EXPERIMENTAL(selection);
          lexical.$setSelection(normalizedSelection);
        }
        editor.dispatchCommand(DRAG_DROP_PASTE, files);
      }
      event.preventDefault();
      return true;
    }
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection)) {
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DRAGSTART_COMMAND, event => {
    const [isFileTransfer] = eventFiles(event);
    const selection = lexical.$getSelection();
    if (isFileTransfer && !lexical.$isRangeSelection(selection)) {
      return false;
    }
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DRAGOVER_COMMAND, event => {
    const [isFileTransfer] = eventFiles(event);
    const selection = lexical.$getSelection();
    if (isFileTransfer && !lexical.$isRangeSelection(selection)) {
      return false;
    }
    const x = event.clientX;
    const y = event.clientY;
    const eventRange = caretFromPoint(x, y);
    if (eventRange !== null) {
      const node = lexical.$getNearestNodeFromDOMNode(eventRange.node);
      if (lexical.$isDecoratorNode(node)) {
        // Show browser caret as the user is dragging the media across the screen. Won't work
        // for DecoratorNode nor it's relevant.
        event.preventDefault();
      }
    }
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.SELECT_ALL_COMMAND, () => {
    lexical.$selectAll();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.COPY_COMMAND, event => {
    clipboard.copyToClipboard(editor, utils.objectKlassEquals(event, ClipboardEvent) ? event : null);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.CUT_COMMAND, event => {
    onCutForRichText(event, editor);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.PASTE_COMMAND, event => {
    const [, files, hasTextContent] = eventFiles(event);
    if (files.length > 0 && !hasTextContent) {
      editor.dispatchCommand(DRAG_DROP_PASTE, files);
      return true;
    }

    // if inputs then paste within the input ignore creating a new node on paste event
    if (lexical.isSelectionCapturedInDecoratorInput(event.target)) {
      return false;
    }
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection)) {
      onPasteForRichText(event, editor);
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR));
  return removeListener;
}

exports.$createHeadingNode = $createHeadingNode;
exports.$createQuoteNode = $createQuoteNode;
exports.$isHeadingNode = $isHeadingNode;
exports.$isQuoteNode = $isQuoteNode;
exports.DRAG_DROP_PASTE = DRAG_DROP_PASTE;
exports.HeadingNode = HeadingNode;
exports.QuoteNode = QuoteNode;
exports.eventFiles = eventFiles;
exports.registerRichText = registerRichText;
