import {type TextNode} from 'lexical';
import type {TextMatchTransformer} from './MarkdownTransformers';

export function findOutermostTextMatchTransformer(
  textNode_: TextNode,
  textMatchTransformers: Array<TextMatchTransformer>,
): {
  startIndex: number;
  endIndex: number;
  transformer: TextMatchTransformer;
  match: RegExpMatchArray;
} | null {
  let textNode = textNode_;

  let foundMatchStartIndex: number | undefined = undefined;
  let foundMatchEndIndex: number | undefined = undefined;
  let foundMatchTransformer: TextMatchTransformer | undefined = undefined;
  let foundMatch: RegExpMatchArray | undefined = undefined;

  for (const transformer of textMatchTransformers) {
    if (!transformer.replace || !transformer.importRegExp) {
      continue;
    }
    const match = textNode.getTextContent().match(transformer.importRegExp);

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
      (startIndex < foundMatchStartIndex && endIndex > foundMatchEndIndex)
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
    startIndex: foundMatchStartIndex,
    endIndex: foundMatchEndIndex,
    transformer: foundMatchTransformer,
    match: foundMatch,
  };
}

export function importFoundTextMatchTransformer(
  textNode: TextNode,
  startIndex: number,
  endIndex: number,
  transformer: TextMatchTransformer,
  match: RegExpMatchArray,
): {
  transformedNode: TextNode;
  nodeBefore: TextNode | undefined; // If split
  nodeAfter: TextNode | undefined; // If split
} | null {
  let transformedNode, nodeAfter, nodeBefore;

  if (startIndex === 0) {
    [transformedNode, textNode] = textNode.splitText(endIndex);
  } else {
    [nodeBefore, transformedNode, nodeAfter] = textNode.splitText(
      startIndex,
      endIndex,
    );
  }

  if (!transformer?.replace) {
    return null;
  }
  const potentialTransformedNode: any = transformer.replace(
    transformedNode,
    match,
  );

  return {
    nodeAfter,
    nodeBefore,
    transformedNode: potentialTransformedNode,
  };
}
