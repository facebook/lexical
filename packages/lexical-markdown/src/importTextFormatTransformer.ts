/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TextFormatTransformersIndex} from './MarkdownImport';
import type {TextFormatTransformer} from './MarkdownTransformers';
import type {TextNode} from 'lexical';

import {PUNCTUATION, WHITESPACE} from './utils';

interface Delimiter {
  index: number;
  char: string;
  length: number;
  originalLength: number;
  canOpen: boolean;
  canClose: boolean;
  active: boolean;
}

export function findOutermostTextFormatTransformer(
  textNode: TextNode,
  textFormatTransformersIndex: TextFormatTransformersIndex,
): {
  startIndex: number;
  endIndex: number;
  transformer: TextFormatTransformer;
  match: RegExpMatchArray;
} | null {
  const textContent = textNode.getTextContent();

  // Find code span first. Emphasis delimiters inside inline elements (e.g., code spans)
  // should not be processed. Currently only code spans are handled; other inline elements
  // (e.g., links, raw HTML) may need similar treatment in the future.
  const codeRegex = textFormatTransformersIndex.fullMatchRegExpByTag['`'];
  const codeTransformer = textFormatTransformersIndex.transformersByTag['`'];
  let codeMatch = null;
  if (codeRegex && codeTransformer) {
    codeRegex.lastIndex = 0;
    const codeRegexMatch = codeRegex.exec(textContent);
    codeMatch = codeRegexMatch
      ? {
          content: codeRegexMatch[2],
          endIndex: codeRegexMatch.index + codeRegexMatch[0].length,
          startIndex: codeRegexMatch.index,
          tag: '`',
        }
      : null;
  }

  const delimiters = scanDelimiters(textContent, textFormatTransformersIndex);
  const emphasisMatch =
    delimiters.length > 0
      ? processEmphasis(textContent, delimiters, textFormatTransformersIndex)
      : null;

  let resultMatch = null;
  let resultTransformer = null;

  if (codeMatch && emphasisMatch) {
    if (
      emphasisMatch.startIndex <= codeMatch.startIndex &&
      emphasisMatch.endIndex >= codeMatch.endIndex
    ) {
      resultMatch = emphasisMatch;
      resultTransformer =
        textFormatTransformersIndex.transformersByTag[emphasisMatch.tag];
    } else {
      resultMatch = codeMatch;
      resultTransformer = codeTransformer;
    }
  } else if (codeMatch) {
    resultMatch = codeMatch;
    resultTransformer = codeTransformer;
  } else if (emphasisMatch) {
    resultMatch = emphasisMatch;
    resultTransformer =
      textFormatTransformersIndex.transformersByTag[emphasisMatch.tag];
  }

  if (!resultMatch || !resultTransformer) {
    return null;
  }

  const regexMatch: RegExpMatchArray = [
    textContent.slice(resultMatch.startIndex, resultMatch.endIndex),
    resultMatch.tag,
    resultMatch.content,
  ];
  regexMatch.index = resultMatch.startIndex;
  regexMatch.input = textContent;

  return {
    endIndex: resultMatch.endIndex,
    match: regexMatch,
    startIndex: resultMatch.startIndex,
    transformer: resultTransformer,
  };
}

function scanDelimiters(
  text: string,
  transformersIndex: TextFormatTransformersIndex,
): Delimiter[] {
  const delimiters: Delimiter[] = [];
  const delimiterChars = new Set(
    Object.keys(transformersIndex.transformersByTag)
      .filter((tag) => tag[0] !== '`')
      .map((tag) => tag[0]),
  );

  let i = 0;
  while (i < text.length) {
    const char = text[i];

    if (!delimiterChars.has(char) || isEscaped(text, i)) {
      i++;
      continue;
    }

    let len = 1;
    while (i + len < text.length && text[i + len] === char) {
      len++;
    }

    const canOpen = canEmphasis(char, text, i, len, true);
    const canClose = canEmphasis(char, text, i, len, false);

    if (canOpen || canClose) {
      delimiters.push({
        active: true,
        canClose,
        canOpen,
        char,
        index: i,
        length: len,
        originalLength: len,
      });
    }

    i += len;
  }

  return delimiters;
}

function processEmphasis(
  text: string,
  delimiters: Delimiter[],
  transformersIndex: TextFormatTransformersIndex,
): {
  startIndex: number;
  endIndex: number;
  tag: string;
  content: string;
} | null {
  const openersBottom: Record<string, number> = {};
  let currentPos = 0;
  let result = null;

  while (currentPos < delimiters.length) {
    const closer = delimiters[currentPos];

    if (!closer.active || !closer.canClose || closer.length === 0) {
      currentPos++;
      continue;
    }

    const bottomKey = `${closer.char}${closer.canOpen}`;
    const bottom = openersBottom[bottomKey] ?? -1;
    let foundOpener = false;

    for (let openIdx = currentPos - 1; openIdx > bottom; openIdx--) {
      const opener = delimiters[openIdx];

      if (
        !opener.active ||
        !opener.canOpen ||
        opener.length === 0 ||
        opener.char !== closer.char
      ) {
        continue;
      }

      // Rule of 3
      if (opener.canClose || closer.canOpen) {
        const sum = opener.originalLength + closer.originalLength;
        if (
          sum % 3 === 0 &&
          opener.originalLength % 3 !== 0 &&
          closer.originalLength % 3 !== 0
        ) {
          continue;
        }
      }

      const maxLen = Math.min(opener.length, closer.length);
      const matchedTag = Object.keys(transformersIndex.transformersByTag)
        .filter((t) => t[0] === opener.char && t.length <= maxLen)
        .sort((a, b) => b.length - a.length)[0];

      if (!matchedTag) {
        continue;
      }

      foundOpener = true;
      const matchLen = matchedTag.length;
      const match = {
        content: text.slice(opener.index + opener.length, closer.index),
        endIndex: closer.index + matchLen,
        startIndex: opener.index + (opener.length - matchLen),
        tag: matchedTag,
      };

      if (
        !result ||
        match.startIndex < result.startIndex ||
        (match.startIndex === result.startIndex &&
          match.endIndex > result.endIndex)
      ) {
        result = match;
      }

      for (let j = openIdx + 1; j < currentPos; j++) {
        delimiters[j].active = false;
      }

      opener.length -= matchLen;
      closer.length -= matchLen;
      opener.active = opener.length > 0;

      if (closer.length > 0) {
        closer.index += matchLen;
      } else {
        closer.active = false;
        currentPos++;
      }

      break;
    }

    if (!foundOpener) {
      openersBottom[bottomKey] = currentPos - 1;
      if (!closer.canOpen) {
        closer.active = false;
      }
      currentPos++;
    }
  }

  return result;
}

function canEmphasis(
  char: string,
  text: string,
  index: number,
  length: number,
  isOpen: boolean,
): boolean {
  if (!isFlanking(text, index, length, isOpen)) {
    return false;
  }
  if (char === '*') {
    return true;
  }
  if (char === '_') {
    if (!isFlanking(text, index, length, !isOpen)) {
      return true;
    }
    const adjacentChar = isOpen ? text[index - 1] : text[index + length];
    return adjacentChar !== undefined && PUNCTUATION.test(adjacentChar);
  }
  return true;
}

function isFlanking(
  text: string,
  index: number,
  length: number,
  isLeft: boolean,
): boolean {
  const charBefore = text[index - 1];
  const charAfter = text[index + length];

  const [primary, secondary] = isLeft
    ? [charAfter, charBefore]
    : [charBefore, charAfter];

  if (primary === undefined || WHITESPACE.test(primary)) {
    return false;
  }
  if (!PUNCTUATION.test(primary)) {
    return true;
  }
  return (
    secondary === undefined ||
    WHITESPACE.test(secondary) ||
    PUNCTUATION.test(secondary)
  );
}

function isEscaped(text: string, index: number): boolean {
  let count = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    count++;
  }
  return count % 2 === 1;
}

export function importTextFormatTransformer(
  textNode: TextNode,
  startIndex: number,
  endIndex: number,
  transformer: TextFormatTransformer,
  match: RegExpMatchArray,
): {
  transformedNode: TextNode;
  nodeBefore: TextNode | undefined; // If split
  nodeAfter: TextNode | undefined; // If split
} {
  const textContent = textNode.getTextContent();

  // No text matches - we can safely process the text format match
  let transformedNode, nodeAfter, nodeBefore;

  // If matching full content there's no need to run splitText and can reuse existing textNode
  // to update its content and apply format. E.g. for **_Hello_** string after applying bold
  // format (**) it will reuse the same text node to apply italic (_)
  if (match[0] === textContent) {
    transformedNode = textNode;
  } else {
    if (startIndex === 0) {
      [transformedNode, nodeAfter] = textNode.splitText(endIndex);
    } else {
      [nodeBefore, transformedNode, nodeAfter] = textNode.splitText(
        startIndex,
        endIndex,
      );
    }
  }

  transformedNode.setTextContent(match[2]);

  if (transformer) {
    for (const format of transformer.format) {
      if (!transformedNode.hasFormat(format)) {
        transformedNode.toggleFormat(format);
      }
    }
  }

  return {
    nodeAfter: nodeAfter,
    nodeBefore: nodeBefore,
    transformedNode: transformedNode,
  };
}
