/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');
var list = require('@lexical/list');
var richText = require('@lexical/rich-text');
var utils = require('@lexical/utils');
var code = require('@lexical/code');
var link = require('@lexical/link');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function indexBy(list, callback) {
  const index = {};
  for (const item of list) {
    const key = callback(item);
    if (index[key]) {
      index[key].push(item);
    } else {
      index[key] = [item];
    }
  }
  return index;
}
function transformersByType(transformers) {
  const byType = indexBy(transformers, t => t.type);
  return {
    element: byType.element || [],
    textFormat: byType['text-format'] || [],
    textMatch: byType['text-match'] || []
  };
}
const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function createMarkdownExport(transformers) {
  const byType = transformersByType(transformers);

  // Export only uses text formats that are responsible for single format
  // e.g. it will filter out *** (bold, italic) and instead use separate ** and *
  const textFormatTransformers = byType.textFormat.filter(transformer => transformer.format.length === 1);
  return node => {
    const output = [];
    const children = (node || lexical.$getRoot()).getChildren();
    for (const child of children) {
      const result = exportTopLevelElements(child, byType.element, textFormatTransformers, byType.textMatch);
      if (result != null) {
        output.push(result);
      }
    }
    return output.join('\n\n');
  };
}
function exportTopLevelElements(node, elementTransformers, textTransformersIndex, textMatchTransformers) {
  for (const transformer of elementTransformers) {
    const result = transformer.export(node, _node => exportChildren(_node, textTransformersIndex, textMatchTransformers));
    if (result != null) {
      return result;
    }
  }
  if (lexical.$isElementNode(node)) {
    return exportChildren(node, textTransformersIndex, textMatchTransformers);
  } else if (lexical.$isDecoratorNode(node)) {
    return node.getTextContent();
  } else {
    return null;
  }
}
function exportChildren(node, textTransformersIndex, textMatchTransformers) {
  const output = [];
  const children = node.getChildren();
  mainLoop: for (const child of children) {
    for (const transformer of textMatchTransformers) {
      const result = transformer.export(child, parentNode => exportChildren(parentNode, textTransformersIndex, textMatchTransformers), (textNode, textContent) => exportTextFormat(textNode, textContent, textTransformersIndex));
      if (result != null) {
        output.push(result);
        continue mainLoop;
      }
    }
    if (lexical.$isLineBreakNode(child)) {
      output.push('\n');
    } else if (lexical.$isTextNode(child)) {
      output.push(exportTextFormat(child, child.getTextContent(), textTransformersIndex));
    } else if (lexical.$isElementNode(child)) {
      output.push(exportChildren(child, textTransformersIndex, textMatchTransformers));
      // don't need a line break after the last child
      if (children.indexOf(child) !== children.length - 1) {
        output.push('\n');
      }
    } else if (lexical.$isDecoratorNode(child)) {
      output.push(child.getTextContent());
    }
  }
  return output.join('');
}
function exportTextFormat(node, textContent, textTransformers) {
  // This function handles the case of a string looking like this: "   foo   "
  // Where it would be invalid markdown to generate: "**   foo   **"
  // We instead want to trim the whitespace out, apply formatting, and then
  // bring the whitespace back. So our returned string looks like this: "   **foo**   "
  const frozenString = textContent.trim();
  let output = frozenString;
  const applied = new Set();
  for (const transformer of textTransformers) {
    const format = transformer.format[0];
    const tag = transformer.tag;
    if (hasFormat(node, format) && !applied.has(format)) {
      // Multiple tags might be used for the same format (*, _)
      applied.add(format);
      // Prevent adding opening tag is already opened by the previous sibling
      const previousNode = getTextSibling(node, true);
      if (!hasFormat(previousNode, format)) {
        output = tag + output;
      }

      // Prevent adding closing tag if next sibling will do it
      const nextNode = getTextSibling(node, false);
      if (!hasFormat(nextNode, format)) {
        output += tag;
      }
    }
  }

  // Replace trimmed version of textContent ensuring surrounding whitespace is not modified
  return textContent.replace(frozenString, output);
}

// Get next or previous text sibling a text node, including cases
// when it's a child of inline element (e.g. link)
function getTextSibling(node, backward) {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
  if (!sibling) {
    const parent = node.getParentOrThrow();
    if (parent.isInline()) {
      sibling = backward ? parent.getPreviousSibling() : parent.getNextSibling();
    }
  }
  while (sibling) {
    if (lexical.$isElementNode(sibling)) {
      if (!sibling.isInline()) {
        break;
      }
      const descendant = backward ? sibling.getLastDescendant() : sibling.getFirstDescendant();
      if (lexical.$isTextNode(descendant)) {
        return descendant;
      } else {
        sibling = backward ? sibling.getPreviousSibling() : sibling.getNextSibling();
      }
    }
    if (lexical.$isTextNode(sibling)) {
      return sibling;
    }
    if (!lexical.$isElementNode(sibling)) {
      return null;
    }
  }
  return null;
}
function hasFormat(node, format) {
  return lexical.$isTextNode(node) && node.hasFormat(format);
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
CAN_USE_DOM && 'InputEvent' in window && !documentMode ? 'getTargetRanges' in new window.InputEvent('input') : false;
const IS_SAFARI = CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
const IS_IOS = CAN_USE_DOM && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Keep these in case we need to use them in the future.
// export const IS_WINDOWS: boolean = CAN_USE_DOM && /Win/.test(navigator.platform);
const IS_CHROME = CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent: boolean = CAN_USE_DOM && 'TextEvent' in window && !documentMode;

const IS_APPLE_WEBKIT = CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !IS_CHROME;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const MARKDOWN_EMPTY_LINE_REG_EXP = /^\s{0,3}$/;
function parseMarkdownString(parentNode, lines, byType) {
  const linesLength = lines.length;
  const textFormatTransformersIndex = createTextFormatTransformersIndex(byType.textFormat);
  for (let i = 0; i < linesLength;) {
    const lineText = lines[i];
    // handle multi line parser like Codeblocks
    let isMatched = false;
    for (const elementTransformer of byType.element) {
      const match = lineText.match(elementTransformer.regExp);
      if (elementTransformer.getNumberOfLines) {
        const numberOfLines = elementTransformer.getNumberOfLines(lines, i);
        if (i + numberOfLines > lines.length) {
          continue;
        }
        if (match) {
          const elementNode = lexical.$createParagraphNode();
          parentNode.append(elementNode);
          parseMarkdownString(elementNode, lines.slice(i + 1, i + numberOfLines), byType);
          elementTransformer.replace(parentNode.getLastChild(), parentNode.getLastChild().getChildren(), match, true);
          i += numberOfLines;
          /**
           * only add one line if next line is the close mark
           * just like
           * ``` of code block
           * ::: of tip block
           */
          if (i < linesLength && (elementTransformer.closeRegExp && lines[i].match(elementTransformer.closeRegExp) || lines[i].match(elementTransformer.regExp))) {
            i++;
          }
          isMatched = true;
          break;
        }
      }
    }
    if (isMatched) {
      continue;
    }
    importBlocks(lineText, parentNode, byType.element, textFormatTransformersIndex, byType.textMatch);
    i++;
  }
}
function createMarkdownImport(transformers) {
  const byType = transformersByType(transformers);
  return (markdownString, node) => {
    const lines = markdownString.split('\n');
    const root = node || lexical.$getRoot();
    root.clear();
    parseMarkdownString(root, lines, byType);

    // Removing empty paragraphs as md does not really
    // allow empty lines and uses them as dilimiter
    const children = root.getChildren();
    for (const child of children) {
      if (isEmptyParagraph(child)) {
        child.remove();
      }
    }
    if (lexical.$getSelection() !== null) {
      root.selectEnd();
    }
  };
}
function isEmptyParagraph(node) {
  if (!lexical.$isParagraphNode(node)) {
    return false;
  }
  const firstChild = node.getFirstChild();
  return firstChild == null || node.getChildrenSize() === 1 && lexical.$isTextNode(firstChild) && MARKDOWN_EMPTY_LINE_REG_EXP.test(firstChild.getTextContent());
}
function importBlocks(lineText, parentNode, elementTransformers, textFormatTransformersIndex, textMatchTransformers) {
  const lineTextTrimmed = lineText.trim();
  const textNode = lexical.$createTextNode(lineTextTrimmed);
  const elementNode = lexical.$createParagraphNode();
  elementNode.append(textNode);
  parentNode.append(elementNode);
  for (const {
    regExp,
    replace
  } of elementTransformers) {
    const match = lineText.match(regExp);
    if (match) {
      const textContent = lineText.slice(match[0].length);
      textNode.setTextContent(textContent);
      replace(elementNode, [textNode], match, true);
      break;
    }
  }
  importTextFormatTransformers(textNode, textFormatTransformersIndex, textMatchTransformers);

  // If no transformer found and we left with original paragraph node
  // can check if its content can be appended to the previous node
  // if it's a paragraph, quote or list
  if (elementNode.isAttached() && lineTextTrimmed.length > 0) {
    const previousNode = elementNode.getPreviousSibling();
    if (lexical.$isParagraphNode(previousNode) || richText.$isQuoteNode(previousNode) || list.$isListNode(previousNode)) {
      let targetNode = previousNode;
      if (list.$isListNode(previousNode)) {
        const lastDescendant = previousNode.getLastDescendant();
        if (lastDescendant == null) {
          targetNode = null;
        } else {
          targetNode = utils.$findMatchingParent(lastDescendant, list.$isListItemNode);
        }
      }
      if (targetNode != null && targetNode.getTextContentSize() > 0) {
        targetNode.splice(targetNode.getChildrenSize(), 0, [lexical.$createLineBreakNode(), ...elementNode.getChildren()]);
        elementNode.remove();
      }
    }
  }
}

// Processing text content and replaces text format tags.
// It takes outermost tag match and its content, creates text node with
// format based on tag and then recursively executed over node's content
//
// E.g. for "*Hello **world**!*" string it will create text node with
// "Hello **world**!" content and italic format and run recursively over
// its content to transform "**world**" part
function importTextFormatTransformers(textNode, textFormatTransformersIndex, textMatchTransformers) {
  const textContent = textNode.getTextContent();
  const match = findOutermostMatch(textContent, textFormatTransformersIndex);
  if (!match) {
    // Once text format processing is done run text match transformers, as it
    // only can span within single text node (unline formats that can cover multiple nodes)
    importTextMatchTransformers(textNode, textMatchTransformers);
    return;
  }
  let currentNode, remainderNode, leadingNode;

  // If matching full content there's no need to run splitText and can reuse existing textNode
  // to update its content and apply format. E.g. for **_Hello_** string after applying bold
  // format (**) it will reuse the same text node to apply italic (_)
  if (match[0] === textContent) {
    currentNode = textNode;
  } else {
    const startIndex = match.index || 0;
    const endIndex = startIndex + match[0].length;
    if (startIndex === 0) {
      [currentNode, remainderNode] = textNode.splitText(endIndex);
    } else {
      [leadingNode, currentNode, remainderNode] = textNode.splitText(startIndex, endIndex);
    }
  }
  currentNode.setTextContent(match[2]);
  const transformer = textFormatTransformersIndex.transformersByTag[match[1]];
  if (transformer) {
    for (const format of transformer.format) {
      if (!currentNode.hasFormat(format)) {
        currentNode.toggleFormat(format);
      }
    }
  }

  // Recursively run over inner text if it's not inline code
  if (!currentNode.hasFormat('code')) {
    importTextFormatTransformers(currentNode, textFormatTransformersIndex, textMatchTransformers);
  }

  // Run over leading/remaining text if any
  if (leadingNode) {
    importTextFormatTransformers(leadingNode, textFormatTransformersIndex, textMatchTransformers);
  }
  if (remainderNode) {
    importTextFormatTransformers(remainderNode, textFormatTransformersIndex, textMatchTransformers);
  }
}
function importTextMatchTransformers(textNode_, textMatchTransformers) {
  let textNode = textNode_;
  mainLoop: while (textNode) {
    for (const transformer of textMatchTransformers) {
      const match = textNode.getTextContent().match(transformer.importRegExp);
      if (!match) {
        continue;
      }
      const startIndex = match.index || 0;
      const endIndex = startIndex + match[0].length;
      let replaceNode, leftTextNode, rightTextNode;
      if (startIndex === 0) {
        [replaceNode, textNode] = textNode.splitText(endIndex);
      } else {
        [leftTextNode, replaceNode, rightTextNode] = textNode.splitText(startIndex, endIndex);
      }
      if (leftTextNode) {
        importTextMatchTransformers(leftTextNode, textMatchTransformers);
      }
      if (rightTextNode) {
        textNode = rightTextNode;
      }
      transformer.replace(replaceNode, match);
      continue mainLoop;
    }
    break;
  }
}

// Finds first "<tag>content<tag>" match that is not nested into another tag
function findOutermostMatch(textContent, textTransformersIndex) {
  const openTagsMatch = textContent.match(textTransformersIndex.openTagsRegExp);
  if (openTagsMatch == null) {
    return null;
  }
  for (const match of openTagsMatch) {
    // Open tags reg exp might capture leading space so removing it
    // before using match to find transformer
    const tag = match.replace(/^\s/, '');
    const fullMatchRegExp = textTransformersIndex.fullMatchRegExpByTag[tag];
    if (fullMatchRegExp == null) {
      continue;
    }
    const fullMatch = textContent.match(fullMatchRegExp);
    const transformer = textTransformersIndex.transformersByTag[tag];
    if (fullMatch != null && transformer != null) {
      if (transformer.intraword !== false) {
        return fullMatch;
      }

      // For non-intraword transformers checking if it's within a word
      // or surrounded with space/punctuation/newline
      const {
        index = 0
      } = fullMatch;
      const beforeChar = textContent[index - 1];
      const afterChar = textContent[index + fullMatch[0].length];
      if ((!beforeChar || PUNCTUATION_OR_SPACE.test(beforeChar)) && (!afterChar || PUNCTUATION_OR_SPACE.test(afterChar))) {
        return fullMatch;
      }
    }
  }
  return null;
}
function createTextFormatTransformersIndex(textTransformers) {
  const transformersByTag = {};
  const fullMatchRegExpByTag = {};
  const openTagsRegExp = [];
  const escapeRegExp = `(?<![\\\\])`;
  for (const transformer of textTransformers) {
    const {
      tag
    } = transformer;
    transformersByTag[tag] = transformer;
    const tagRegExp = tag.replace(/(\*|\^|\+)/g, '\\$1');
    openTagsRegExp.push(tagRegExp);
    if (IS_SAFARI || IS_IOS || IS_APPLE_WEBKIT) {
      fullMatchRegExpByTag[tag] = new RegExp(`(${tagRegExp})(?![${tagRegExp}\\s])(.*?[^${tagRegExp}\\s])${tagRegExp}(?!${tagRegExp})`);
    } else {
      fullMatchRegExpByTag[tag] = new RegExp(`(?<![\\\\${tagRegExp}])(${tagRegExp})((\\\\${tagRegExp})?.*?[^${tagRegExp}\\s](\\\\${tagRegExp})?)((?<!\\\\)|(?<=\\\\\\\\))(${tagRegExp})(?![\\\\${tagRegExp}])`);
    }
  }
  return {
    // Reg exp to find open tag + content + close tag
    fullMatchRegExpByTag,
    // Reg exp to find opening tags
    openTagsRegExp: new RegExp((IS_SAFARI || IS_IOS || IS_APPLE_WEBKIT ? '' : `${escapeRegExp}`) + '(' + openTagsRegExp.join('|') + ')', 'g'),
    transformersByTag
  };
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function runElementTransformers(parentNode, anchorNode, anchorOffset, elementTransformers) {
  const grandParentNode = parentNode.getParent();
  if (!lexical.$isRootOrShadowRoot(grandParentNode) || parentNode.getFirstChild() !== anchorNode) {
    return false;
  }
  const textContent = anchorNode.getTextContent();

  // Checking for anchorOffset position to prevent any checks for cases when caret is too far
  // from a line start to be a part of block-level markdown trigger.
  //
  // TODO:
  // Can have a quick check if caret is close enough to the beginning of the string (e.g. offset less than 10-20)
  // since otherwise it won't be a markdown shortcut, but tables are exception
  if (textContent[anchorOffset - 1] !== ' ') {
    return false;
  }
  for (const {
    regExp,
    replace
  } of elementTransformers) {
    const match = textContent.match(regExp);
    if (match && match[0].length === anchorOffset) {
      const nextSiblings = anchorNode.getNextSiblings();
      const [leadingNode, remainderNode] = anchorNode.splitText(anchorOffset);
      leadingNode.remove();
      const siblings = remainderNode ? [remainderNode, ...nextSiblings] : nextSiblings;
      replace(parentNode, siblings, match, false);
      return true;
    }
  }
  return false;
}
function runTextMatchTransformers(anchorNode, anchorOffset, transformersByTrigger) {
  let textContent = anchorNode.getTextContent();
  const lastChar = textContent[anchorOffset - 1];
  const transformers = transformersByTrigger[lastChar];
  if (transformers == null) {
    return false;
  }

  // If typing in the middle of content, remove the tail to do
  // reg exp match up to a string end (caret position)
  if (anchorOffset < textContent.length) {
    textContent = textContent.slice(0, anchorOffset);
  }
  for (const transformer of transformers) {
    const match = textContent.match(transformer.regExp);
    if (match === null) {
      continue;
    }
    const startIndex = match.index || 0;
    const endIndex = startIndex + match[0].length;
    let replaceNode;
    if (startIndex === 0) {
      [replaceNode] = anchorNode.splitText(endIndex);
    } else {
      [, replaceNode] = anchorNode.splitText(startIndex, endIndex);
    }
    replaceNode.selectNext(0, 0);
    transformer.replace(replaceNode, match);
    return true;
  }
  return false;
}
function runTextFormatTransformers(anchorNode, anchorOffset, textFormatTransformers) {
  const textContent = anchorNode.getTextContent();
  const closeTagEndIndex = anchorOffset - 1;
  const closeChar = textContent[closeTagEndIndex];
  // Quick check if we're possibly at the end of inline markdown style
  const matchers = textFormatTransformers[closeChar];
  if (!matchers) {
    return false;
  }
  for (const matcher of matchers) {
    const {
      tag
    } = matcher;
    const tagLength = tag.length;
    const closeTagStartIndex = closeTagEndIndex - tagLength + 1;

    // If tag is not single char check if rest of it matches with text content
    if (tagLength > 1) {
      if (!isEqualSubString(textContent, closeTagStartIndex, tag, 0, tagLength)) {
        continue;
      }
    }

    // Space before closing tag cancels inline markdown
    if (textContent[closeTagStartIndex - 1] === ' ') {
      continue;
    }

    // Some tags can not be used within words, hence should have newline/space/punctuation after it
    const afterCloseTagChar = textContent[closeTagEndIndex + 1];
    if (matcher.intraword === false && afterCloseTagChar && !PUNCTUATION_OR_SPACE.test(afterCloseTagChar)) {
      continue;
    }
    const closeNode = anchorNode;
    let openNode = closeNode;
    let openTagStartIndex = getOpenTagStartIndex(textContent, closeTagStartIndex, tag);

    // Go through text node siblings and search for opening tag
    // if haven't found it within the same text node as closing tag
    let sibling = openNode;
    while (openTagStartIndex < 0 && (sibling = sibling.getPreviousSibling())) {
      if (lexical.$isLineBreakNode(sibling)) {
        break;
      }
      if (lexical.$isTextNode(sibling)) {
        const siblingTextContent = sibling.getTextContent();
        openNode = sibling;
        openTagStartIndex = getOpenTagStartIndex(siblingTextContent, siblingTextContent.length, tag);
      }
    }

    // Opening tag is not found
    if (openTagStartIndex < 0) {
      continue;
    }

    // No content between opening and closing tag
    if (openNode === closeNode && openTagStartIndex + tagLength === closeTagStartIndex) {
      continue;
    }

    // Checking longer tags for repeating chars (e.g. *** vs **)
    const prevOpenNodeText = openNode.getTextContent();
    if (openTagStartIndex > 0 && prevOpenNodeText[openTagStartIndex - 1] === closeChar) {
      continue;
    }

    // Some tags can not be used within words, hence should have newline/space/punctuation before it
    const beforeOpenTagChar = prevOpenNodeText[openTagStartIndex - 1];
    if (matcher.intraword === false && beforeOpenTagChar && !PUNCTUATION_OR_SPACE.test(beforeOpenTagChar)) {
      continue;
    }

    // Clean text from opening and closing tags (starting from closing tag
    // to prevent any offset shifts if we start from opening one)
    const prevCloseNodeText = closeNode.getTextContent();
    const closeNodeText = prevCloseNodeText.slice(0, closeTagStartIndex) + prevCloseNodeText.slice(closeTagEndIndex + 1);
    closeNode.setTextContent(closeNodeText);
    const openNodeText = openNode === closeNode ? closeNodeText : prevOpenNodeText;
    openNode.setTextContent(openNodeText.slice(0, openTagStartIndex) + openNodeText.slice(openTagStartIndex + tagLength));
    const selection = lexical.$getSelection();
    const nextSelection = lexical.$createRangeSelection();
    lexical.$setSelection(nextSelection);
    // Adjust offset based on deleted chars
    const newOffset = closeTagEndIndex - tagLength * (openNode === closeNode ? 2 : 1) + 1;
    nextSelection.anchor.set(openNode.__key, openTagStartIndex, 'text');
    nextSelection.focus.set(closeNode.__key, newOffset, 'text');

    // Apply formatting to selected text
    for (const format of matcher.format) {
      if (!nextSelection.hasFormat(format)) {
        nextSelection.formatText(format);
      }
    }

    // Collapse selection up to the focus point
    nextSelection.anchor.set(nextSelection.focus.key, nextSelection.focus.offset, nextSelection.focus.type);

    // Remove formatting from collapsed selection
    for (const format of matcher.format) {
      if (nextSelection.hasFormat(format)) {
        nextSelection.toggleFormat(format);
      }
    }
    if (lexical.$isRangeSelection(selection)) {
      nextSelection.format = selection.format;
    }
    return true;
  }
  return false;
}
function getOpenTagStartIndex(string, maxIndex, tag) {
  const tagLength = tag.length;
  for (let i = maxIndex; i >= tagLength; i--) {
    const startIndex = i - tagLength;
    if (isEqualSubString(string, startIndex, tag, 0, tagLength) &&
    // Space after opening tag cancels transformation
    string[startIndex + tagLength] !== ' ') {
      return startIndex;
    }
  }
  return -1;
}
function isEqualSubString(stringA, aStart, stringB, bStart, length) {
  for (let i = 0; i < length; i++) {
    if (stringA[aStart + i] !== stringB[bStart + i]) {
      return false;
    }
  }
  return true;
}
function registerMarkdownShortcuts(editor, transformers = TRANSFORMERS) {
  const byType = transformersByType(transformers);
  const textFormatTransformersIndex = indexBy(byType.textFormat, ({
    tag
  }) => tag[tag.length - 1]);
  const textMatchTransformersIndex = indexBy(byType.textMatch, ({
    trigger
  }) => trigger);
  for (const transformer of transformers) {
    const type = transformer.type;
    if (type === 'element' || type === 'text-match') {
      const dependencies = transformer.dependencies;
      for (const node of dependencies) {
        if (!editor.hasNode(node)) {
          {
            throw Error(`MarkdownShortcuts: missing dependency ${node.getType()} for transformer. Ensure node dependency is included in editor initial config.`);
          }
        }
      }
    }
  }
  const transform = (parentNode, anchorNode, anchorOffset) => {
    if (runElementTransformers(parentNode, anchorNode, anchorOffset, byType.element)) {
      return;
    }
    if (runTextMatchTransformers(anchorNode, anchorOffset, textMatchTransformersIndex)) {
      return;
    }
    runTextFormatTransformers(anchorNode, anchorOffset, textFormatTransformersIndex);
  };
  return editor.registerUpdateListener(({
    tags,
    dirtyLeaves,
    editorState,
    prevEditorState
  }) => {
    // Ignore updates from undo/redo (as changes already calculated)
    if (tags.has('historic')) {
      return;
    }

    // If editor is still composing (i.e. backticks) we must wait before the user confirms the key
    if (editor.isComposing()) {
      return;
    }
    const selection = editorState.read(lexical.$getSelection);
    const prevSelection = prevEditorState.read(lexical.$getSelection);
    if (!lexical.$isRangeSelection(prevSelection) || !lexical.$isRangeSelection(selection) || !selection.isCollapsed()) {
      return;
    }
    const anchorKey = selection.anchor.key;
    const anchorOffset = selection.anchor.offset;
    const anchorNode = editorState._nodeMap.get(anchorKey);
    if (!lexical.$isTextNode(anchorNode) || !dirtyLeaves.has(anchorKey) || anchorOffset !== 1 && anchorOffset > prevSelection.anchor.offset + 1) {
      return;
    }
    editor.update(() => {
      // Markdown is not available inside code
      if (anchorNode.hasFormat('code')) {
        return;
      }
      const parentNode = anchorNode.getParent();
      if (parentNode === null || code.$isCodeNode(parentNode)) {
        return;
      }
      transform(parentNode, anchorNode, selection.anchor.offset);
    });
  });
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const createBlockNode = createNode => {
  return (parentNode, children, match) => {
    const node = createNode(match);
    node.append(...children);
    parentNode.replace(node);
    node.select(0, 0);
  };
};

// Amount of spaces that define indentation level
// TODO: should be an option
const LIST_INDENT_SIZE = 4;
const listReplace = listType => {
  return (parentNode, children, match) => {
    const previousNode = parentNode.getPreviousSibling();
    const nextNode = parentNode.getNextSibling();
    const listItem = list.$createListItemNode(listType === 'check' ? match[3] === 'x' : undefined);
    if (list.$isListNode(nextNode) && nextNode.getListType() === listType) {
      const firstChild = nextNode.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(listItem);
      } else {
        // should never happen, but let's handle gracefully, just in case.
        nextNode.append(listItem);
      }
      parentNode.remove();
    } else if (list.$isListNode(previousNode) && previousNode.getListType() === listType) {
      previousNode.append(listItem);
      parentNode.remove();
    } else {
      const list$1 = list.$createListNode(listType, listType === 'number' ? Number(match[2]) : undefined);
      list$1.append(listItem);
      parentNode.replace(list$1);
    }
    listItem.append(...children);
    listItem.select(0, 0);
    const indent = Math.floor(match[1].length / LIST_INDENT_SIZE);
    if (indent) {
      listItem.setIndent(indent);
    }
  };
};
const listExport = (listNode, exportChildren, depth) => {
  const output = [];
  const children = listNode.getChildren();
  let index = 0;
  for (const listItemNode of children) {
    if (list.$isListItemNode(listItemNode)) {
      if (listItemNode.getChildrenSize() === 1) {
        const firstChild = listItemNode.getFirstChild();
        if (list.$isListNode(firstChild)) {
          output.push(listExport(firstChild, exportChildren, depth + 1));
          continue;
        }
      }
      const indent = ' '.repeat(depth * LIST_INDENT_SIZE);
      const listType = listNode.getListType();
      const prefix = listType === 'number' ? `${listNode.getStart() + index}. ` : listType === 'check' ? `- [${listItemNode.getChecked() ? 'x' : ' '}] ` : '- ';
      output.push(indent + prefix + exportChildren(listItemNode));
      index++;
    }
  }
  return output.join('\n');
};
const HEADING = {
  dependencies: [richText.HeadingNode],
  export: (node, exportChildren) => {
    if (!richText.$isHeadingNode(node)) {
      return null;
    }
    const level = Number(node.getTag().slice(1));
    return '#'.repeat(level) + ' ' + exportChildren(node);
  },
  regExp: /^(#{1,6})\s/,
  replace: createBlockNode(match => {
    const tag = 'h' + match[1].length;
    return richText.$createHeadingNode(tag);
  }),
  type: 'element'
};
const QUOTE = {
  dependencies: [richText.QuoteNode],
  export: (node, exportChildren) => {
    if (!richText.$isQuoteNode(node)) {
      return null;
    }
    const lines = exportChildren(node).split('\n');
    const output = [];
    for (const line of lines) {
      output.push('> ' + line);
    }
    return output.join('\n');
  },
  regExp: /^>\s/,
  replace: (parentNode, children, _match, isImport) => {
    if (isImport) {
      const previousNode = parentNode.getPreviousSibling();
      if (richText.$isQuoteNode(previousNode)) {
        previousNode.splice(previousNode.getChildrenSize(), 0, [lexical.$createLineBreakNode(), ...children]);
        previousNode.select(0, 0);
        parentNode.remove();
        return;
      }
    }
    const node = richText.$createQuoteNode();
    node.append(...children);
    parentNode.replace(node);
    node.select(0, 0);
  },
  type: 'element'
};
const CODE = {
  dependencies: [code.CodeNode],
  export: node => {
    if (!code.$isCodeNode(node)) {
      return null;
    }
    const textContent = node.getTextContent();
    return '```' + (node.getLanguage() || '') + (textContent ? '\n' + textContent : '') + '\n' + '```';
  },
  getNumberOfLines: (lines, startLineIndex) => {
    const CODE_BLOCK_REG_EXP = /^```(\w{1,10})?\s?$/;
    let endLineIndex = startLineIndex;
    const linesLength = lines.length;
    while (++endLineIndex < linesLength) {
      const closeMatch = lines[endLineIndex].match(CODE_BLOCK_REG_EXP);
      if (closeMatch) {
        return endLineIndex - startLineIndex;
      }
    }
    return endLineIndex - startLineIndex;
  },
  regExp: /^```(\w{1,10})?\s?$/,
  replace: createBlockNode(match => {
    return code.$createCodeNode(match ? match[1] : undefined);
  }),
  type: 'element'
};
const UNORDERED_LIST = {
  dependencies: [list.ListNode, list.ListItemNode],
  export: (node, exportChildren) => {
    return list.$isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)[-*+]\s/,
  replace: listReplace('bullet'),
  type: 'element'
};
const CHECK_LIST = {
  dependencies: [list.ListNode, list.ListItemNode],
  export: (node, exportChildren) => {
    return list.$isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)(?:-\s)?\s?(\[(\s|x)?\])\s/i,
  replace: listReplace('check'),
  type: 'element'
};
const ORDERED_LIST = {
  dependencies: [list.ListNode, list.ListItemNode],
  export: (node, exportChildren) => {
    return list.$isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)(\d{1,})\.\s/,
  replace: listReplace('number'),
  type: 'element'
};
const INLINE_CODE = {
  format: ['code'],
  tag: '`',
  type: 'text-format'
};
const HIGHLIGHT = {
  format: ['highlight'],
  tag: '==',
  type: 'text-format'
};
const BOLD_ITALIC_STAR = {
  format: ['bold', 'italic'],
  tag: '***',
  type: 'text-format'
};
const BOLD_ITALIC_UNDERSCORE = {
  format: ['bold', 'italic'],
  intraword: false,
  tag: '___',
  type: 'text-format'
};
const BOLD_STAR = {
  format: ['bold'],
  tag: '**',
  type: 'text-format'
};
const BOLD_UNDERSCORE = {
  format: ['bold'],
  intraword: false,
  tag: '__',
  type: 'text-format'
};
const STRIKETHROUGH = {
  format: ['strikethrough'],
  tag: '~~',
  type: 'text-format'
};
const ITALIC_STAR = {
  format: ['italic'],
  tag: '*',
  type: 'text-format'
};
const ITALIC_UNDERSCORE = {
  format: ['italic'],
  intraword: false,
  tag: '_',
  type: 'text-format'
};

// Order of text transformers matters:
//
// - code should go first as it prevents any transformations inside
// - then longer tags match (e.g. ** or __ should go before * or _)
const LINK = {
  dependencies: [link.LinkNode],
  export: (node, exportChildren, exportFormat) => {
    if (!link.$isLinkNode(node)) {
      return null;
    }
    const title = node.getTitle();
    const linkContent = title ? `[${node.getTextContent()}](${node.getURL()} "${title}")` : `[${node.getTextContent()}](${node.getURL()})`;
    const firstChild = node.getFirstChild();
    // Add text styles only if link has single text node inside. If it's more
    // then one we ignore it as markdown does not support nested styles for links
    if (node.getChildrenSize() === 1 && lexical.$isTextNode(firstChild)) {
      return exportFormat(firstChild, linkContent);
    } else {
      return linkContent;
    }
  },
  importRegExp: /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
  regExp: /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    const [, linkText, linkUrl, linkTitle] = match;
    const linkNode = link.$createLinkNode(linkUrl, {
      title: linkTitle
    });
    const linkTextNode = lexical.$createTextNode(linkText);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match'
};

/** @module @lexical/markdown */
const ELEMENT_TRANSFORMERS = [HEADING, QUOTE, CODE, UNORDERED_LIST, ORDERED_LIST];

// Order of text format transformers matters:
//
// - code should go first as it prevents any transformations inside
// - then longer tags match (e.g. ** or __ should go before * or _)
const TEXT_FORMAT_TRANSFORMERS = [INLINE_CODE, BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE, BOLD_STAR, BOLD_UNDERSCORE, HIGHLIGHT, ITALIC_STAR, ITALIC_UNDERSCORE, STRIKETHROUGH];
const TEXT_MATCH_TRANSFORMERS = [LINK];
const TRANSFORMERS = [...ELEMENT_TRANSFORMERS, ...TEXT_FORMAT_TRANSFORMERS, ...TEXT_MATCH_TRANSFORMERS];
function $convertFromMarkdownString(markdown, transformers = TRANSFORMERS, node) {
  const importMarkdown = createMarkdownImport(transformers);
  return importMarkdown(markdown, node);
}
function $convertToMarkdownString(transformers = TRANSFORMERS, node) {
  const exportMarkdown = createMarkdownExport(transformers);
  return exportMarkdown(node);
}

exports.$convertFromMarkdownString = $convertFromMarkdownString;
exports.$convertToMarkdownString = $convertToMarkdownString;
exports.BOLD_ITALIC_STAR = BOLD_ITALIC_STAR;
exports.BOLD_ITALIC_UNDERSCORE = BOLD_ITALIC_UNDERSCORE;
exports.BOLD_STAR = BOLD_STAR;
exports.BOLD_UNDERSCORE = BOLD_UNDERSCORE;
exports.CHECK_LIST = CHECK_LIST;
exports.CODE = CODE;
exports.ELEMENT_TRANSFORMERS = ELEMENT_TRANSFORMERS;
exports.HEADING = HEADING;
exports.HIGHLIGHT = HIGHLIGHT;
exports.INLINE_CODE = INLINE_CODE;
exports.ITALIC_STAR = ITALIC_STAR;
exports.ITALIC_UNDERSCORE = ITALIC_UNDERSCORE;
exports.LINK = LINK;
exports.ORDERED_LIST = ORDERED_LIST;
exports.QUOTE = QUOTE;
exports.STRIKETHROUGH = STRIKETHROUGH;
exports.TEXT_FORMAT_TRANSFORMERS = TEXT_FORMAT_TRANSFORMERS;
exports.TEXT_MATCH_TRANSFORMERS = TEXT_MATCH_TRANSFORMERS;
exports.TRANSFORMERS = TRANSFORMERS;
exports.UNORDERED_LIST = UNORDERED_LIST;
exports.createBlockNode = createBlockNode;
exports.registerMarkdownShortcuts = registerMarkdownShortcuts;
