/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var link = require('@lexical/link');
var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var utils = require('@lexical/utils');
var lexical = require('lexical');
var react = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function createLinkMatcherWithRegExp(regExp, urlTransformer = text => text) {
  return text => {
    const match = regExp.exec(text);
    if (match === null) return null;
    return {
      index: match.index,
      length: match[0].length,
      text: match[0],
      url: urlTransformer(text)
    };
  };
}
function findFirstMatch(text, matchers) {
  for (let i = 0; i < matchers.length; i++) {
    const match = matchers[i](text);
    if (match) {
      return match;
    }
  }
  return null;
}
const PUNCTUATION_OR_SPACE = /[.,;\s]/;
function isSeparator(char) {
  return PUNCTUATION_OR_SPACE.test(char);
}
function endsWithSeparator(textContent) {
  return isSeparator(textContent[textContent.length - 1]);
}
function startsWithSeparator(textContent) {
  return isSeparator(textContent[0]);
}
function isPreviousNodeValid(node) {
  let previousNode = node.getPreviousSibling();
  if (lexical.$isElementNode(previousNode)) {
    previousNode = previousNode.getLastDescendant();
  }
  return previousNode === null || lexical.$isLineBreakNode(previousNode) || lexical.$isTextNode(previousNode) && endsWithSeparator(previousNode.getTextContent());
}
function isNextNodeValid(node) {
  let nextNode = node.getNextSibling();
  if (lexical.$isElementNode(nextNode)) {
    nextNode = nextNode.getFirstDescendant();
  }
  return nextNode === null || lexical.$isLineBreakNode(nextNode) || lexical.$isTextNode(nextNode) && startsWithSeparator(nextNode.getTextContent());
}
function isContentAroundIsValid(matchStart, matchEnd, text, node) {
  const contentBeforeIsValid = matchStart > 0 ? isSeparator(text[matchStart - 1]) : isPreviousNodeValid(node);
  if (!contentBeforeIsValid) {
    return false;
  }
  const contentAfterIsValid = matchEnd < text.length ? isSeparator(text[matchEnd]) : isNextNodeValid(node);
  return contentAfterIsValid;
}
function handleLinkCreation(node, matchers, onChange) {
  const nodeText = node.getTextContent();
  let text = nodeText;
  let invalidMatchEnd = 0;
  let remainingTextNode = node;
  let match;
  while ((match = findFirstMatch(text, matchers)) && match !== null) {
    const matchStart = match.index;
    const matchLength = match.length;
    const matchEnd = matchStart + matchLength;
    const isValid = isContentAroundIsValid(invalidMatchEnd + matchStart, invalidMatchEnd + matchEnd, nodeText, node);
    if (isValid) {
      let linkTextNode;
      if (invalidMatchEnd + matchStart === 0) {
        [linkTextNode, remainingTextNode] = remainingTextNode.splitText(invalidMatchEnd + matchLength);
      } else {
        [, linkTextNode, remainingTextNode] = remainingTextNode.splitText(invalidMatchEnd + matchStart, invalidMatchEnd + matchStart + matchLength);
      }
      const linkNode = link.$createAutoLinkNode(match.url, match.attributes);
      const textNode = lexical.$createTextNode(match.text);
      textNode.setFormat(linkTextNode.getFormat());
      textNode.setDetail(linkTextNode.getDetail());
      linkNode.append(textNode);
      linkTextNode.replace(linkNode);
      onChange(match.url, null);
      invalidMatchEnd = 0;
    } else {
      invalidMatchEnd += matchEnd;
    }
    text = text.substring(matchEnd);
  }
}
function handleLinkEdit(linkNode, matchers, onChange) {
  // Check children are simple text
  const children = linkNode.getChildren();
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const child = children[i];
    if (!lexical.$isTextNode(child) || !child.isSimpleText()) {
      replaceWithChildren(linkNode);
      onChange(null, linkNode.getURL());
      return;
    }
  }

  // Check text content fully matches
  const text = linkNode.getTextContent();
  const match = findFirstMatch(text, matchers);
  if (match === null || match.text !== text) {
    replaceWithChildren(linkNode);
    onChange(null, linkNode.getURL());
    return;
  }

  // Check neighbors
  if (!isPreviousNodeValid(linkNode) || !isNextNodeValid(linkNode)) {
    replaceWithChildren(linkNode);
    onChange(null, linkNode.getURL());
    return;
  }
  const url = linkNode.getURL();
  if (url !== match.url) {
    linkNode.setURL(match.url);
    onChange(match.url, url);
  }
  if (match.attributes) {
    const rel = linkNode.getRel();
    if (rel !== match.attributes.rel) {
      linkNode.setRel(match.attributes.rel || null);
      onChange(match.attributes.rel || null, rel);
    }
    const target = linkNode.getTarget();
    if (target !== match.attributes.target) {
      linkNode.setTarget(match.attributes.target || null);
      onChange(match.attributes.target || null, target);
    }
  }
}

// Bad neighbours are edits in neighbor nodes that make AutoLinks incompatible.
// Given the creation preconditions, these can only be simple text nodes.
function handleBadNeighbors(textNode, matchers, onChange) {
  const previousSibling = textNode.getPreviousSibling();
  const nextSibling = textNode.getNextSibling();
  const text = textNode.getTextContent();
  if (link.$isAutoLinkNode(previousSibling) && !startsWithSeparator(text)) {
    previousSibling.append(textNode);
    handleLinkEdit(previousSibling, matchers, onChange);
    onChange(null, previousSibling.getURL());
  }
  if (link.$isAutoLinkNode(nextSibling) && !endsWithSeparator(text)) {
    replaceWithChildren(nextSibling);
    handleLinkEdit(nextSibling, matchers, onChange);
    onChange(null, nextSibling.getURL());
  }
}
function replaceWithChildren(node) {
  const children = node.getChildren();
  const childrenLength = children.length;
  for (let j = childrenLength - 1; j >= 0; j--) {
    node.insertAfter(children[j]);
  }
  node.remove();
  return children.map(child => child.getLatest());
}
function useAutoLink(editor, matchers, onChange) {
  react.useEffect(() => {
    if (!editor.hasNodes([link.AutoLinkNode])) {
      {
        throw Error(`LexicalAutoLinkPlugin: AutoLinkNode not registered on editor`);
      }
    }
    const onChangeWrapped = (url, prevUrl) => {
      if (onChange) {
        onChange(url, prevUrl);
      }
    };
    return utils.mergeRegister(editor.registerNodeTransform(lexical.TextNode, textNode => {
      const parent = textNode.getParentOrThrow();
      const previous = textNode.getPreviousSibling();
      if (link.$isAutoLinkNode(parent)) {
        handleLinkEdit(parent, matchers, onChangeWrapped);
      } else if (!link.$isLinkNode(parent)) {
        if (textNode.isSimpleText() && (startsWithSeparator(textNode.getTextContent()) || !link.$isAutoLinkNode(previous))) {
          handleLinkCreation(textNode, matchers, onChangeWrapped);
        }
        handleBadNeighbors(textNode, matchers, onChangeWrapped);
      }
    }));
  }, [editor, matchers, onChange]);
}
function AutoLinkPlugin({
  matchers,
  onChange
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  useAutoLink(editor, matchers, onChange);
  return null;
}

exports.AutoLinkPlugin = AutoLinkPlugin;
exports.createLinkMatcherWithRegExp = createLinkMatcherWithRegExp;
