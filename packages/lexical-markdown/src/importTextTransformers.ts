import {$isTextNode, type TextNode} from 'lexical';
import type {TextFormatTransformersIndex} from './MarkdownImport';
import type {TextMatchTransformer} from './MarkdownTransformers';
import {
  findOutermostTextFormatTransformer,
  importTextFormatTransformer,
} from './importTextFormatTransformer';
import {
  findOutermostTextMatchTransformer,
  importFoundTextMatchTransformer,
} from './importTextMatchTransformer';

/**
 * Handles applying both text format and text match transformers.
 * It finds the outermost text format or text match and applies it,
 * then recursively calls itself to apply the next outermost transformer,
 * until there are no more transformers to apply.
 */
export function importTextTransformers(
  textNode: TextNode,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: Array<TextMatchTransformer>,
) {
  let foundTextFormat = findOutermostTextFormatTransformer(
    textNode,
    textFormatTransformersIndex,
  );

  let foundTextMatch = findOutermostTextMatchTransformer(
    textNode,
    textMatchTransformers,
  );

  if (foundTextFormat && foundTextMatch) {
    // Find the outermost transformer
    if (
      foundTextFormat.startIndex <= foundTextMatch.startIndex &&
      foundTextFormat.endIndex >= foundTextMatch.endIndex
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

    if (
      result?.nodeAfter &&
      $isTextNode(result.nodeAfter) &&
      !result.nodeAfter.hasFormat('code')
    ) {
      importTextTransformers(
        result.nodeAfter,
        textFormatTransformersIndex,
        textMatchTransformers,
      );
    }
    if (
      result?.nodeBefore &&
      $isTextNode(result.nodeBefore) &&
      !result.nodeBefore.hasFormat('code')
    ) {
      importTextTransformers(
        result.nodeBefore,
        textFormatTransformersIndex,
        textMatchTransformers,
      );
    }
    if (
      result?.transformedNode &&
      $isTextNode(result.transformedNode) &&
      !result.transformedNode.hasFormat('code')
    ) {
      importTextTransformers(
        result.transformedNode,
        textFormatTransformersIndex,
        textMatchTransformers,
      );
    }
    return;
  } else if (foundTextMatch) {
    const result = importFoundTextMatchTransformer(
      textNode,
      foundTextMatch.startIndex,
      foundTextMatch.endIndex,
      foundTextMatch.transformer,
      foundTextMatch.match,
    );
    if (
      result?.nodeAfter &&
      $isTextNode(result.nodeAfter) &&
      !result.nodeAfter.hasFormat('code')
    ) {
      importTextTransformers(
        result.nodeAfter,
        textFormatTransformersIndex,
        textMatchTransformers,
      );
    }
    if (
      result?.nodeBefore &&
      $isTextNode(result.nodeBefore) &&
      !result.nodeBefore.hasFormat('code')
    ) {
      importTextTransformers(
        result.nodeBefore,
        textFormatTransformersIndex,
        textMatchTransformers,
      );
    }
    if (
      result?.transformedNode &&
      $isTextNode(result.transformedNode) &&
      !result.transformedNode.hasFormat('code')
    ) {
      importTextTransformers(
        result.transformedNode,
        textFormatTransformersIndex,
        textMatchTransformers,
      );
    }
    return;
  } else {
    // Done!
    return;
  }
}
