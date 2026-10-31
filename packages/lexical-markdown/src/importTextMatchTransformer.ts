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
    // opener, and what comes before it is ordinary text, so the match starts
    // there; its label may then be empty, as in `x[[](u)`.
    const opener = getLinkLabelOpener(match[1]);
    if (opener !== null && opener >= 0) {
      const cut = opener + 1;
      const inner = [...match] as RegExpExecArray;
      inner[0] = match[0].slice(cut);
      inner[1] = match[1].slice(cut);
      inner.index = match.index + cut;
      inner.input = text;
      return inner;
    }
    if (!isEscaped(text, match.index)) {
      return match;
    }
    search.lastIndex = match.index + 1;
  }
  return null;
}

/**
 * The match each transformer with the built-in link syntax found in a text,
 * with where it starts in that text, or `null` when there is none. It is the
 * first match in what is left of the text after any offset up to its start,
 * since the link syntax does not look behind its match.
 */
export type LinkMatches = Map<
  TextMatchTransformer,
  {index: number; match: RegExpExecArray} | null
>;

export function findOutermostTextMatchTransformer(
  textNode_: TextNode,
  textMatchTransformers: TextMatchTransformer[],
  // The link matches found earlier in the text that `textNode_` is what is
  // left of from `offset`.
  links: LinkMatches = new Map(),
  offset = 0,
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
    let match: RegExpMatchArray | null;
    // Transformers sharing the built-in link syntax need the same candidate rules.
    if (
      LINK.importRegExp !== undefined &&
      transformer.importRegExp.source === LINK.importRegExp.source
    ) {
      const found = links.get(transformer);
      if (found === undefined || (found !== null && found.index < offset)) {
        const linkMatch = matchLink(text, transformer.importRegExp);
        links.set(
          transformer,
          linkMatch && {index: offset + linkMatch.index, match: linkMatch},
        );
        match = linkMatch;
      } else if (found === null) {
        match = null;
      } else {
        const moved = [...found.match] as RegExpMatchArray;
        moved.index = found.index - offset;
        moved.input = text;
        match = moved;
      }
    } else {
      match = text.match(transformer.importRegExp);
    }

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
