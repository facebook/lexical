/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {TextMatchTransformer} from './MarkdownTransformers';
import type {TextNode} from 'lexical';

import {getLinkLabelOpener, LINK} from './MarkdownTransformers';
import {isEscaped} from './utils';

function matchLink(text: string, regExp: RegExp): RegExpExecArray | null {
  const search = new RegExp(
    regExp.source,
    regExp.flags.replace(/[gy]/g, '') + 'g',
  );
  let match;
  while ((match = search.exec(text)) !== null) {
    // A `[` that the label holds outside a code span is the link's real
    // opener, and what comes before it is ordinary text, so search again
    // from there.
    const opener = getLinkLabelOpener(match[1]);
    if (opener !== null && opener >= 0) {
      search.lastIndex = match.index + opener + 1;
    } else if (!isEscaped(text, match.index)) {
      return match;
    } else {
      search.lastIndex = match.index + 1;
    }
  }
  return null;
}

export function findOutermostTextMatchTransformer(
  textNode_: TextNode,
  textMatchTransformers: TextMatchTransformer[],
): {
  startIndex: number;
  endIndex: number;
  transformer: TextMatchTransformer;
  match: RegExpMatchArray;
} | null {
  const textNode = textNode_;

  let foundMatchStartIndex: number | undefined = undefined;
  let foundMatchEndIndex: number | undefined = undefined;
  let foundMatchTransformer: TextMatchTransformer | undefined = undefined;
  let foundMatch: RegExpMatchArray | undefined = undefined;

  for (const transformer of textMatchTransformers) {
    if (!transformer.replace || !transformer.importRegExp) {
      continue;
    }
    const text = textNode.getTextContent();
    // Transformers sharing the built-in link syntax need the same candidate rules.
    const match =
      LINK.importRegExp !== undefined &&
      transformer.importRegExp.source === LINK.importRegExp.source
        ? matchLink(text, transformer.importRegExp)
        : text.match(transformer.importRegExp);

    if (!match) {
      continue;
    }

    const startIndex = match.index || 0;
    const endIndex = transformer.getEndIndex
      ? transformer.getEndIndex(textNode, match)
      : startIndex + match[0].length;

    if (endIndex === false) {
      continue;
    }

    if (
      foundMatchStartIndex === undefined ||
      foundMatchEndIndex === undefined ||
      // Wraps previous match or is strictly before it.
      (startIndex < foundMatchStartIndex &&
        (endIndex > foundMatchEndIndex || endIndex <= foundMatchStartIndex))
    ) {
      foundMatchStartIndex = startIndex;
      foundMatchEndIndex = endIndex;
      foundMatchTransformer = transformer;
      foundMatch = match;
    }
  }

  if (
    foundMatchStartIndex === undefined ||
    foundMatchEndIndex === undefined ||
    foundMatchTransformer === undefined ||
    foundMatch === undefined
  ) {
    return null;
  }

  return {
    endIndex: foundMatchEndIndex,
    match: foundMatch,
    startIndex: foundMatchStartIndex,
    transformer: foundMatchTransformer,
  };
}

export function importFoundTextMatchTransformer(
  textNode: TextNode,
  startIndex: number,
  endIndex: number,
  transformer: TextMatchTransformer,
  match: RegExpMatchArray,
): {
  matchedNode: TextNode;
  transformedNode?: TextNode;
  nodeBefore: TextNode | undefined; // If split
  nodeAfter: TextNode | undefined; // If split
} | null {
  let transformedNode, nodeAfter, nodeBefore;

  if (startIndex === 0) {
    [transformedNode, nodeAfter] = textNode.splitText(endIndex);
  } else {
    [nodeBefore, transformedNode, nodeAfter] = textNode.splitText(
      startIndex,
      endIndex,
    );
  }

  if (!transformer.replace) {
    return null;
  }
  const potentialTransformedNode = transformer.replace(transformedNode, match);

  return {
    matchedNode: transformedNode,
    nodeAfter,
    nodeBefore,
    transformedNode: potentialTransformedNode || undefined,
  };
}
