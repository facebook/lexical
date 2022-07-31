/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalNode, TextFormatType, TextNode} from 'lexical';

import {$isLinkNode} from '@lexical/link';
import {$getRoot, $isElementNode, $isLineBreakNode, $isTextNode} from 'lexical';

import {
  getAllMarkdownCriteriaForParagraphs,
  getAllMarkdownCriteriaForTextNodes,
} from './utils';

export function $convertToMarkdownString(): string {
  const output = [];
  const children = $getRoot().getChildren();

  for (const child of children) {
    const result = exportTopLevelElementOrDecorator(child);

    if (result != null) {
      output.push(result);
    }
  }

  return output.join('\n');
}

function exportTopLevelElementOrDecorator(node: LexicalNode): string | null {
  const elementTransformers = getAllMarkdownCriteriaForParagraphs();

  for (const transformer of elementTransformers) {
    if (transformer.export != null) {
      const result = transformer.export(node, (_node) => exportChildren(_node));

      if (result != null) {
        return result;
      }
    }
  }

  return $isElementNode(node) ? exportChildren(node) : null;
}

function exportChildren(node: ElementNode): string {
  const output = [];
  const children = node.getChildren();

  for (const child of children) {
    if ($isLineBreakNode(child)) {
      output.push('\n');
    } else if ($isTextNode(child)) {
      output.push(exportTextNode(child, child.getTextContent(), node));
    } else if ($isLinkNode(child)) {
      const linkContent = `[${child.getTextContent()}](${child.getURL()})`;
      const firstChild = child.getFirstChild();

      // Add text styles only if link has single text node inside. If it's more
      // then one we either ignore it and have single <a> to cover whole link,
      // or process them, but then have link cut into multiple <a>.
      // For now choosing the first option.
      if (child.getChildrenSize() === 1 && $isTextNode(firstChild)) {
        output.push(exportTextNode(firstChild, linkContent, child));
      } else {
        output.push(linkContent);
      }
    } else if ($isElementNode(child)) {
      output.push(exportChildren(child));
    }
  }

  return output.join('');
}

function exportTextNode(
  node: TextNode,
  textContent: string,
  parentNode: ElementNode,
): string {
  let output = textContent;
  const applied = new Set();
  const textTransformers = getAllMarkdownCriteriaForTextNodes();

  for (const transformer of textTransformers) {
    const {
      exportFormat: format,
      exportTag: tag,
      exportTagClose: tagClose = tag,
    } = transformer;

    if (
      format != null &&
      tag != null &&
      tagClose != null &&
      hasFormat(node, format) &&
      !applied.has(format)
    ) {
      // Multiple tags might be used for the same format (*, _)
      applied.add(format);
      // Prevent adding extra wrapping tags if it's already
      // added by a previous sibling (or will be closed by the next one)
      const previousNode = getTextSibling(node, true);

      if (!hasFormat(previousNode, format)) {
        output = tag + output;
      }

      const nextNode = getTextSibling(node, false);

      if (!hasFormat(nextNode, format)) {
        output += tagClose;
      }
    }
  }

  return output;
}

// Finds text sibling including cases for inline elements
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
  }

  return null;
}

function hasFormat(node: LexicalNode | null, format: TextFormatType): boolean {
  return $isTextNode(node) && node.hasFormat(format);
}
