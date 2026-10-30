/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {TextFormatTransformersIndex} from './MarkdownImport';
import type {TextMatchTransformer} from './MarkdownTransformers';

import {$isTextNode, type LexicalNode, type TextNode} from 'lexical';

import {
  findOutermostTextFormatTransformer,
  importTextFormatTransformer,
} from './importTextFormatTransformer';
import {
  findOutermostTextMatchTransformer,
  importFoundTextMatchTransformer,
} from './importTextMatchTransformer';
import {characterAt, characterBefore, unescapeText} from './utils';

/**
 * Returns true if the node can contain transformable markdown.
 * Code nodes cannot contain transformable markdown.
 * For example, `code **bold**` should not be transformed to
 * <code>code <strong>bold</strong></code>.
 */
export function canContainTransformableMarkdown(
  node: LexicalNode | undefined,
): node is TextNode {
  return $isTextNode(node) && !node.hasFormat('code');
}

/**
 * What a delimiter run that starts at `index` of `text` sees before it, once
 * the text before `index` is split off: the character before the whole run,
 * or `outside` when the run reaches the start of the text.
 */
function characterBeforeRun(
  text: string,
  index: number,
  outside: string | undefined,
): string | undefined {
  let start = index;
  while (start > 0 && text[start - 1] === text[index]) {
    start--;
  }
  return start > 0 ? characterBefore(text, start) : outside;
}

/**
 * What a delimiter run that ends at `index` of `text` sees after it, once the
 * text from `index` is split off.
 */
function characterAfterRun(
  text: string,
  index: number,
  outside: string | undefined,
): string | undefined {
  let end = index;
  while (end < text.length && text[end] === text[index - 1]) {
    end++;
  }
  return end < text.length ? characterAt(text, end) : outside;
}

/**
 * Handles applying both text format and text match transformers.
 * It finds the outermost text format or text match and applies it,
 * then recursively calls itself to apply the next outermost transformer,
 * until there are no more transformers to apply.
 */
export function importTextTransformers(
  textNode: TextNode,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: TextMatchTransformer[],
  // The characters around this text in the text it was split from, so that
  // a delimiter run at its edge reads as it did there.
  before?: string,
  after?: string,
) {
  const text = textNode.getTextContent();
  let foundTextFormat = findOutermostTextFormatTransformer(
    textNode,
    textFormatTransformersIndex,
    before,
    after,
  );

  let foundTextMatch = findOutermostTextMatchTransformer(
    textNode,
    textMatchTransformers,
  );

  if (foundTextFormat && foundTextMatch) {
    // Code spans bind tighter than text-match transformers (e.g. equations
    // or links). A code span must never be partially consumed by a text
    // match, so the match goes only when it fully wraps the span (in which
    // case the span is part of the match's raw content).
    // https://github.com/meta/lexical/issues/8687
    const {startIndex, endIndex} = foundTextMatch;
    const wraps = (span: {startIndex: number; endIndex: number}) =>
      startIndex <= span.startIndex && endIndex >= span.endIndex;
    if (
      (foundTextFormat.isCodeSpan && !wraps(foundTextFormat)) ||
      foundTextFormat.codeSpans.some(
        span =>
          startIndex < span.endIndex &&
          endIndex > span.startIndex &&
          !wraps(span),
      )
    ) {
      // Apply the code span, or the emphasis before it, and not the text
      // match, which would take part of the span.
      foundTextMatch = null;
    } else if (foundTextFormat.isCodeSpan) {
      // foundTextMatch wraps the code span - apply foundTextMatch
      foundTextFormat = null;
    } else if (
      // Find the outermost transformer
      (foundTextFormat.startIndex <= foundTextMatch.startIndex &&
        foundTextFormat.endIndex >= foundTextMatch.endIndex) ||
      // foundTextMatch is not contained within foundTextFormat
      foundTextMatch.startIndex > foundTextFormat.endIndex
    ) {
      // foundTextFormat wraps foundTextMatch - apply foundTextFormat by setting foundTextMatch to null
      foundTextMatch = null;
    } else {
      // foundTextMatch wraps foundTextFormat - apply foundTextMatch by setting foundTextFormat to null
      foundTextFormat = null;
    }
  }

  if (foundTextFormat) {
    const result = importTextFormatTransformer(
      textNode,
      foundTextFormat.startIndex,
      foundTextFormat.endIndex,
      foundTextFormat.transformer,
      foundTextFormat.match,
    );
    const {startIndex, endIndex} = foundTextFormat;
    const tagLength = foundTextFormat.match[1].length;

    if (canContainTransformableMarkdown(result.nodeAfter)) {
      importTextTransformers(
        result.nodeAfter,
        textFormatTransformersIndex,
        textMatchTransformers,
        characterBeforeRun(text, endIndex, before),
        after,
      );
    }
    if (canContainTransformableMarkdown(result.nodeBefore)) {
      importTextTransformers(
        result.nodeBefore,
        textFormatTransformersIndex,
        textMatchTransformers,
        before,
        characterAfterRun(text, startIndex, after),
      );
    }
    if (canContainTransformableMarkdown(result.transformedNode)) {
      importTextTransformers(
        result.transformedNode,
        textFormatTransformersIndex,
        textMatchTransformers,
        characterBeforeRun(text, startIndex + tagLength, before),
        characterAfterRun(text, endIndex - tagLength, after),
      );
    }
  } else if (foundTextMatch) {
    const result = importFoundTextMatchTransformer(
      textNode,
      foundTextMatch.startIndex,
      foundTextMatch.endIndex,
      foundTextMatch.transformer,
      foundTextMatch.match,
    );
    if (!result) {
      return;
    }

    if (canContainTransformableMarkdown(result.nodeAfter)) {
      importTextTransformers(
        result.nodeAfter,
        textFormatTransformersIndex,
        textMatchTransformers,
        characterBeforeRun(text, foundTextMatch.endIndex, before),
        after,
      );
    }
    if (canContainTransformableMarkdown(result.nodeBefore)) {
      importTextTransformers(
        result.nodeBefore,
        textFormatTransformersIndex,
        textMatchTransformers,
        before,
        characterAfterRun(text, foundTextMatch.startIndex, after),
      );
    }
    if (canContainTransformableMarkdown(result.transformedNode)) {
      importTextTransformers(
        result.transformedNode,
        textFormatTransformersIndex,
        textMatchTransformers,
      );
    } else if (
      result.transformedNode === undefined &&
      canContainTransformableMarkdown(result.matchedNode) &&
      result.matchedNode.getParent() !== null
    ) {
      // A void return may leave the matched node in place or move it into a
      // new parent. Read its escapes once without trying the same match again.
      // A parent also exists when importing into a detached tree.
      result.matchedNode.setTextContent(
        unescapeText(result.matchedNode.getTextContent()),
      );
    }
  }

  // Handle escape characters. Only a node that no transformer matched is
  // unescaped here: retained non-code results above have already had their
  // escapes read, and code spans must keep their backslashes.
  if (!foundTextFormat && !foundTextMatch) {
    const textContent = textNode.getTextContent();
    const unescapedText = unescapeText(textContent);
    textNode.setTextContent(unescapedText);
  }
}
