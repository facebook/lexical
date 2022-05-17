/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  ElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
} from '../../flow/LexicalMarkdown';
import type {ElementNode, LexicalNode, TextFormatType, TextNode} from 'lexical';

import {$getRoot, $isElementNode, $isLineBreakNode, $isTextNode} from 'lexical';

import {transformersByType} from './utils';

export function createMarkdownExport(
  transformers: Array<Transformer>,
): () => string {
  const byType = transformersByType(transformers);
  // Export only uses text formats that are responsible for single format
  // e.g. it will filter out *** (bold, italic) and instead use separate ** and *
  const textFormatTransformers = byType.textFormat.filter(
    (transformer) => transformer.format.length === 1,
  );
  return () => {
    const output = [];
    const children = $getRoot().getChildren();

    for (const child of children) {
      const result = exportTopLevelElements(
        child,
        byType.element,
        textFormatTransformers,
        byType.textMatch,
      );
      if (result != null) {
        output.push(result);
      }
    }

    return output.join('\n');
  };
}

function exportTopLevelElements(
  node: LexicalNode,
  elementTransformers: Array<ElementTransformer>,
  textTransformersIndex: Array<TextFormatTransformer>,
  textMatchTransformers: Array<TextMatchTransformer>,
): string | null {
  for (const transformer of elementTransformers) {
    const result = transformer.export(node, (_node) =>
      exportChildren(_node, textTransformersIndex, textMatchTransformers),
    );
    if (result != null) {
      return result;
    }
  }

  return $isElementNode(node)
    ? exportChildren(node, textTransformersIndex, textMatchTransformers)
    : null;
}

function exportChildren(
  node: ElementNode,
  textTransformersIndex: Array<TextFormatTransformer>,
  textMatchTransformers: Array<TextMatchTransformer>,
): string {
  const output = [];
  const children = node.getChildren();

  mainLoop: for (const child of children) {
    if ($isLineBreakNode(child)) {
      output.push('\n');
    } else if ($isTextNode(child)) {
      output.push(
        exportTextFormat(child, child.getTextContent(), textTransformersIndex),
      );
    } else {
      for (const transformer of textMatchTransformers) {
        const result = transformer.export(
          child,
          (parentNode) =>
            exportChildren(
              parentNode,
              textTransformersIndex,
              textMatchTransformers,
            ),
          (textNode, textContent) =>
            exportTextFormat(textNode, textContent, textTransformersIndex),
        );
        if (result != null) {
          output.push(result);
          continue mainLoop;
        }
      }
      if ($isElementNode(child)) {
        output.push(
          exportChildren(child, textTransformersIndex, textMatchTransformers),
        );
      }
    }
  }

  return output.join('');
}

function exportTextFormat(
  node: TextNode,
  textContent: string,
  textTransformers: Array<TextFormatTransformer>,
): string {
  let output = textContent;
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
  return output;
}

// Get next or previous text sibling a text node, including cases
// when it's a child of inline element (e.g. link)
function getTextSibling(node: TextNode, backward: boolean): TextNode | null {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();

  if (!sibling) {
    const parent = node.getParentOrThrow();
    if (parent.isInline()) {
      sibling = backward
        ? parent.getPreviousSibling()
        : parent.getNextSibling();
    }
  }

  while (sibling) {
    if ($isElementNode(sibling)) {
      if (!sibling.isInline()) {
        break;
      }
      const descendant = backward
        ? sibling.getLastDescendant()
        : sibling.getFirstDescendant();

      if ($isTextNode(descendant)) {
        return descendant;
      } else {
        sibling = backward
          ? sibling.getPreviousSibling()
          : sibling.getNextSibling();
      }
    }

    if ($isTextNode(sibling)) {
      return sibling;
    }

    if (!$isElementNode(sibling)) {
      return null;
    }
  }

  return null;
}

function hasFormat(node: ?LexicalNode, format: TextFormatType): boolean {
  return $isTextNode(node) && node.hasFormat(format);
}
