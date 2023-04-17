/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ListType} from '@lexical/list';
import type {HeadingTagType} from '@lexical/rich-text';

import {$createCodeNode, $isCodeNode, CodeNode} from '@lexical/code';
import {$createLinkNode, $isLinkNode, LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createTextNode,
  $isTextNode,
  ElementNode,
  Klass,
  LexicalNode,
  TextFormatType,
  TextNode,
} from 'lexical';

import {$convertToMarkdownString} from '.';

export type Transformer =
  | ElementTransformer
  | TextFormatTransformer
  | TextMatchTransformer;

export type ElementTransformer = {
  dependencies: Array<Klass<LexicalNode>>;
  export: (
    node: LexicalNode,
    // eslint-disable-next-line no-shadow
    traverseChildren: (node: ElementNode) => string,
    transformers: Array<Transformer>,
  ) => string | null;
  regExp: RegExp;
  replace: (
    parentNode: ElementNode,
    children: Array<LexicalNode>,
    match: Array<string>,
    isImport: boolean,
  ) => void;
  type: 'element';
};

export type TextFormatTransformer = Readonly<{
  format: ReadonlyArray<TextFormatType>;
  tag: string;
  intraword?: boolean;
  type: 'text-format';
}>;

export type TextMatchTransformer = Readonly<{
  dependencies: Array<Klass<LexicalNode>>;
  export: (
    node: LexicalNode,
    // eslint-disable-next-line no-shadow
    exportChildren: (node: ElementNode) => string,
    // eslint-disable-next-line no-shadow
    exportFormat: (node: TextNode, textContent: string) => string,
  ) => string | null;
  importRegExp: RegExp;
  regExp: RegExp;
  replace: (node: TextNode, match: RegExpMatchArray) => void;
  trigger: string;
  type: 'text-match';
}>;

const createBlockNode = (
  createNode: (match: Array<string>) => ElementNode,
): ElementTransformer['replace'] => {
  return (parentNode, children, match) => {
    const node = createNode(match);
    node.append(...children);
    parentNode.replace(node);
    node.select(0, 0);
  };
};

// Amount of spaces that define indentation level
// TODO: should be an option
const LIST_INDENT_SIZE = 4;

const listReplace = (listType: ListType): ElementTransformer['replace'] => {
  return (parentNode, children, match) => {
    const previousNode = parentNode.getPreviousSibling();
    const listItem = $createListItemNode(
      listType === 'check' ? match[3] === 'x' : undefined,
    );
    if ($isListNode(previousNode) && previousNode.getListType() === listType) {
      previousNode.append(listItem);
      parentNode.remove();
    } else {
      const list = $createListNode(
        listType,
        listType === 'number' ? Number(match[2]) : undefined,
      );
      list.append(listItem);
      parentNode.replace(list);
    }
    listItem.append(...children);
    listItem.select(0, 0);
    const indent = Math.floor(match[1].length / LIST_INDENT_SIZE);
    if (indent) {
      listItem.setIndent(indent);
    }
  };
};

const listExport = (
  listNode: ListNode,
  exportChildren: (node: ElementNode) => string,
  depth: number,
): string => {
  const output = [];
  const children = listNode.getChildren();
  let index = 0;
  for (const listItemNode of children) {
    if ($isListItemNode(listItemNode)) {
      if (listItemNode.getChildrenSize() === 1) {
        const firstChild = listItemNode.getFirstChild();
        if ($isListNode(firstChild)) {
          output.push(listExport(firstChild, exportChildren, depth + 1));
          continue;
        }
      }
      const indent = ' '.repeat(depth * LIST_INDENT_SIZE);
      const listType = listNode.getListType();
      const prefix =
        listType === 'number'
          ? `${listNode.getStart() + index}. `
          : listType === 'check'
          ? `- [${listItemNode.getChecked() ? 'x' : ' '}] `
          : '- ';
      output.push(indent + prefix + exportChildren(listItemNode));
      index++;
    }
  }

  return output.join('\n');
};

export const HEADING: ElementTransformer = {
  dependencies: [HeadingNode],
  export: (node, exportChildren) => {
    if (!$isHeadingNode(node)) {
      return null;
    }
    const level = Number(node.getTag().slice(1));
    return '#'.repeat(level) + ' ' + exportChildren(node);
  },
  regExp: /^(#{1,6})\s/,
  replace: createBlockNode((match) => {
    const tag = ('h' + match[1].length) as HeadingTagType;
    return $createHeadingNode(tag);
  }),
  type: 'element',
};

export const QUOTE: ElementTransformer = {
  dependencies: [QuoteNode],
  export: (node, _exportChildren, transformers) => {
    if (!$isQuoteNode(node)) {
      return null;
    }

    return $convertToMarkdownString(transformers, node)
      .split('\n\n')
      .map((line) =>
        line
          .split('\n')
          .map((inner) => `> ${inner}`)
          .join('\n'),
      )
      .join('\n');
  },
  regExp: /^>((\s>)*)\s?/,
  replace: (parentNode, children, match, isImport) => {
    // Figure out how many levels of indentation there are
    const numberOfIndents = match[0].length > 1 ? match[0].length / 2 : 1;

    // isImport is true when converting from markdown to AST
    if (isImport) {
      // Get the previous node to append to
      let existingQuoteNode = parentNode.getPreviousSibling();
      // If the previous node was a quote, then we're adding to it (or nesting further)
      if ($isQuoteNode(existingQuoteNode)) {
        // Get the deepest nested blockquote of the previous node and track the number of indents
        let quoteChildren = existingQuoteNode.getChildren();
        let lastQuoteChild = quoteChildren[quoteChildren.length - 1];
        let previousNumberOfIndents = 1;
        while (
          $isQuoteNode(lastQuoteChild) &&
          numberOfIndents > previousNumberOfIndents
        ) {
          previousNumberOfIndents++;
          existingQuoteNode = lastQuoteChild;
          quoteChildren = existingQuoteNode.getChildren();
          lastQuoteChild = quoteChildren[quoteChildren.length - 1];
        }
        if (numberOfIndents > previousNumberOfIndents) {
          // If we still have further indents, we need to create a new quote node
          const topLevelQuote = $createQuoteNode();
          let quoteNode = topLevelQuote;
          for (let i = 1; i < numberOfIndents - previousNumberOfIndents; i++) {
            const newQuote = $createQuoteNode();
            quoteNode.append(newQuote);
            quoteNode = newQuote;
          }
          topLevelQuote.append(...children);
          existingQuoteNode.splice(existingQuoteNode.getChildrenSize(), 0, [
            $createLineBreakNode(),
            topLevelQuote,
          ]);
        } else if ($isQuoteNode(lastQuoteChild)) {
          existingQuoteNode.splice(existingQuoteNode.getChildrenSize(), 0, [
            ...children,
          ]);
        } else {
          // Otherwise we need to add the quote's content to the previous blockquote
          existingQuoteNode.splice(existingQuoteNode.getChildrenSize(), 0, [
            $createLineBreakNode(),
            ...children,
          ]);
        }
        existingQuoteNode.select(0, 0);
        parentNode.remove();
        return;
      }
    }

    const topLevelQuote = $createQuoteNode();
    let quoteNode = topLevelQuote;
    for (let i = 1; i < numberOfIndents; i++) {
      const newQuote = $createQuoteNode();
      quoteNode.append(newQuote);
      quoteNode = newQuote;
    }
    quoteNode.append(...children);
    parentNode.replace(quoteNode);
    quoteNode.select(0, 0);
  },
  type: 'element',
};

export const CODE: ElementTransformer = {
  dependencies: [CodeNode],
  export: (node: LexicalNode) => {
    if (!$isCodeNode(node)) {
      return null;
    }
    const textContent = node.getTextContent();
    return (
      '```' +
      (node.getLanguage() || '') +
      (textContent ? '\n' + textContent : '') +
      '\n' +
      '```'
    );
  },
  regExp: /^```(\w{1,10})?\s/,
  replace: createBlockNode((match) => {
    return $createCodeNode(match ? match[1] : undefined);
  }),
  type: 'element',
};

export const UNORDERED_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)[-*+]\s/,
  replace: listReplace('bullet'),
  type: 'element',
};

export const CHECK_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)(?:-\s)?\s?(\[(\s|x)?\])\s/i,
  replace: listReplace('check'),
  type: 'element',
};

export const ORDERED_LIST: ElementTransformer = {
  dependencies: [ListNode, ListItemNode],
  export: (node, exportChildren) => {
    return $isListNode(node) ? listExport(node, exportChildren, 0) : null;
  },
  regExp: /^(\s*)(\d{1,})\.\s/,
  replace: listReplace('number'),
  type: 'element',
};

export const INLINE_CODE: TextFormatTransformer = {
  format: ['code'],
  tag: '`',
  type: 'text-format',
};

export const HIGHLIGHT: TextFormatTransformer = {
  format: ['highlight'],
  tag: '==',
  type: 'text-format',
};

export const BOLD_ITALIC_STAR: TextFormatTransformer = {
  format: ['bold', 'italic'],
  tag: '***',
  type: 'text-format',
};

export const BOLD_ITALIC_UNDERSCORE: TextFormatTransformer = {
  format: ['bold', 'italic'],
  intraword: false,
  tag: '___',
  type: 'text-format',
};

export const BOLD_STAR: TextFormatTransformer = {
  format: ['bold'],
  tag: '**',
  type: 'text-format',
};

export const BOLD_UNDERSCORE: TextFormatTransformer = {
  format: ['bold'],
  intraword: false,
  tag: '__',
  type: 'text-format',
};

export const STRIKETHROUGH: TextFormatTransformer = {
  format: ['strikethrough'],
  tag: '~~',
  type: 'text-format',
};

export const ITALIC_STAR: TextFormatTransformer = {
  format: ['italic'],
  tag: '*',
  type: 'text-format',
};

export const ITALIC_UNDERSCORE: TextFormatTransformer = {
  format: ['italic'],
  intraword: false,
  tag: '_',
  type: 'text-format',
};

// Order of text transformers matters:
//
// - code should go first as it prevents any transformations inside
// - then longer tags match (e.g. ** or __ should go before * or _)
export const LINK: TextMatchTransformer = {
  dependencies: [LinkNode],
  export: (node, exportChildren, exportFormat) => {
    if (!$isLinkNode(node)) {
      return null;
    }
    const title = node.getTitle();
    const linkContent = title
      ? `[${node.getTextContent()}](${node.getURL()} "${title}")`
      : `[${node.getTextContent()}](${node.getURL()})`;
    const firstChild = node.getFirstChild();
    // Add text styles only if link has single text node inside. If it's more
    // then one we ignore it as markdown does not support nested styles for links
    if (node.getChildrenSize() === 1 && $isTextNode(firstChild)) {
      return exportFormat(firstChild, linkContent);
    } else {
      return linkContent;
    }
  },
  importRegExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
  regExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    const [, linkText, linkUrl, linkTitle] = match;
    const linkNode = $createLinkNode(linkUrl, {title: linkTitle});
    const linkTextNode = $createTextNode(linkText);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match',
};
