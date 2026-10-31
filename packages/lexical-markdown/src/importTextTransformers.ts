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
  advanceFormatScan,
  findOutermostTextFormatTransformer,
  type FormatScan,
  importTextFormatTransformer,
  partlyHoldsCodeSpan,
  scanTextFormats,
} from './importTextFormatTransformer';
import {
  findOutermostTextMatchTransformer,
  importFoundTextMatchTransformer,
  type LinkMatches,
} from './importTextMatchTransformer';
import {
  characterAt,
  characterBefore,
  getDelimiterRunEdge,
  unescapeText,
} from './utils';

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
 * What a delimiter run cut at `index` of `text` sees beyond its far end once
 * the text is split there: before the run that starts at `index` when `step`
 * is -1, after the run that ends there when it is 1. `outside` is what lies
 * beyond the text.
 */
function characterBeyondRun(
  text: string,
  index: number,
  step: 1 | -1,
  outside: string | undefined,
): string | undefined {
  const edge = getDelimiterRunEdge(text, index, step);
  return step === 1
    ? edge < text.length
      ? characterAt(text, edge)
      : outside
    : edge > 0
      ? characterBefore(text, edge)
      : outside;
}

/**
 * Handles applying both text format and text match transformers. It finds
 * the outermost text format or text match and applies it, goes on with the
 * text after it the same way, and then, from the last match back to the
 * first, imports the text before each match and then the text inside it,
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
  // The text after each match is imported in this loop rather than by
  // recursion, so that a long paragraph does not nest a call per match, and
  // with what was found in the whole text, which still holds for the rest of
  // it as long as no match there reached into what came before.
  const deferred: (() => void)[] = [];
  let rest: TextRest | null = [textNode, before, after, null];
  while (rest !== null) {
    rest = importOutermost(
      rest[0],
      textFormatTransformersIndex,
      textMatchTransformers,
      rest[1],
      rest[2],
      rest[3],
      deferred,
    );
  }
  for (let i = deferred.length - 1; i >= 0; i--) {
    deferred[i]();
  }
}

/** The formats and links found in a text, for what is left of it. */
interface TextScan {
  formats: FormatScan;
  links: LinkMatches;
}

type TextRest = [
  textNode: TextNode,
  before: string | undefined,
  after: string | undefined,
  scan: TextScan | null,
];

/**
 * Applies the outermost transformer in `textNode`, adds the import of the
 * text before and inside its match to `deferred`, and returns the text after
 * it, for the caller to import next.
 */
function importOutermost(
  textNode: TextNode,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: TextMatchTransformer[],
  before: string | undefined,
  after: string | undefined,
  previousScan: TextScan | null,
  deferred: (() => void)[],
): TextRest | null {
  const text = textNode.getTextContent();
  const scan: TextScan =
    previousScan !== null &&
    previousScan.formats.text.length - previousScan.formats.offset ===
      text.length &&
    previousScan.formats.text.endsWith(text)
      ? previousScan
      : {
          formats: scanTextFormats(
            text,
            textFormatTransformersIndex,
            before,
            after,
          ),
          links: new Map(),
        };
  const {formats} = scan;
  let foundTextFormat = findOutermostTextFormatTransformer(
    text,
    textFormatTransformersIndex,
    formats,
  );

  let foundTextMatch = findOutermostTextMatchTransformer(
    textNode,
    textMatchTransformers,
    scan.links,
    formats.offset,
  );

  if (foundTextFormat && foundTextMatch) {
    // Code spans bind tighter than text-match transformers (e.g. equations
    // or links). A code span must never be partially consumed by a text
    // match, so the match goes only when it fully wraps the span (in which
    // case the span is part of the match's raw content).
    // https://github.com/meta/lexical/issues/8687
    const {startIndex, endIndex} = foundTextMatch;
    if (partlyHoldsCodeSpan(formats, startIndex, endIndex)) {
      // Apply the code span, or the emphasis before it, and not the text
      // match, which would take part of the span.
      foundTextMatch = null;
    } else if (foundTextFormat.isCodeSpan) {
      // The text match goes first when it wraps the code span or ends before
      // it; one after it waits for the span.
      if (
        (startIndex <= foundTextFormat.startIndex &&
          endIndex >= foundTextFormat.endIndex) ||
        endIndex <= foundTextFormat.startIndex
      ) {
        foundTextFormat = null;
      } else {
        foundTextMatch = null;
      }
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

  // Defers the import of the text before a match from `startIndex` to
  // `endIndex`, then of the text inside it with `importInside`, and returns
  // the text after it, each with what lies beyond the run cut at its edge.
  const importAround = (
    nodeBefore: LexicalNode | undefined,
    nodeAfter: LexicalNode | undefined,
    startIndex: number,
    endIndex: number,
    importInside: () => void,
  ): TextRest | null => {
    const beforeMatch = characterBeyondRun(text, startIndex, 1, after);
    deferred.push(() => {
      if (canContainTransformableMarkdown(nodeBefore)) {
        importTextTransformers(
          nodeBefore,
          textFormatTransformersIndex,
          textMatchTransformers,
          before,
          beforeMatch,
        );
      }
      importInside();
    });
    return canContainTransformableMarkdown(nodeAfter)
      ? [
          nodeAfter,
          characterBeyondRun(text, endIndex, -1, before),
          after,
          advanceFormatScan(formats, formats.offset + endIndex) ? scan : null,
        ]
      : null;
  };

  if (foundTextFormat) {
    const result = importTextFormatTransformer(
      textNode,
      foundTextFormat.startIndex,
      foundTextFormat.endIndex,
      foundTextFormat.transformer,
      foundTextFormat.match,
    );
    const {startIndex, endIndex, isCodeSpan} = foundTextFormat;
    const tagLength = foundTextFormat.match[1].length;
    // A code span's fence is not its tag's length, and its content is not
    // read for emphasis against what lies outside it.
    const insideBefore = isCodeSpan
      ? undefined
      : characterBeyondRun(text, startIndex + tagLength, -1, before);
    const insideAfter = isCodeSpan
      ? undefined
      : characterBeyondRun(text, endIndex - tagLength, 1, after);
    return importAround(
      result.nodeBefore,
      result.nodeAfter,
      startIndex,
      endIndex,
      () => {
        if (canContainTransformableMarkdown(result.transformedNode)) {
          importTextTransformers(
            result.transformedNode,
            textFormatTransformersIndex,
            textMatchTransformers,
            insideBefore,
            insideAfter,
          );
        }
      },
    );
  } else if (foundTextMatch) {
    const result = importFoundTextMatchTransformer(
      textNode,
      foundTextMatch.startIndex,
      foundTextMatch.endIndex,
      foundTextMatch.transformer,
      foundTextMatch.match,
    );
    if (!result) {
      return null;
    }
    return importAround(
      result.nodeBefore,
      result.nodeAfter,
      foundTextMatch.startIndex,
      foundTextMatch.endIndex,
      () => {
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
          // A void return may leave the matched node in place or move it into
          // a new parent. Read its escapes once without trying the same match
          // again. A parent also exists when importing into a detached tree.
          result.matchedNode.setTextContent(
            unescapeText(result.matchedNode.getTextContent()),
          );
        }
      },
    );
  }

  // Handle escape characters. Only a node that no transformer matched gets
  // here: retained non-code results above have already had their escapes
  // read, and code spans must keep their backslashes.
  textNode.setTextContent(unescapeText(text));
  return null;
}
