/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementTransformer,
  MultilineElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
} from './MarkdownTransformers';

import {$isListItemNode, $isListNode, ListItemNode} from '@lexical/list';
import {$isQuoteNode} from '@lexical/rich-text';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  ElementNode,
  TextNode,
} from 'lexical';

import {importTextTransformers} from './importTextTransformers';
import {
  $createMarkdownLineBreakNode,
  CHECK_LIST_REGEX,
  CODE_START_REGEX,
  ORDERED_LIST_REGEX,
  QUOTE_REGEX,
  UNORDERED_LIST_REGEX,
} from './MarkdownTransformers';
import {isEmptyParagraph, transformersByType} from './utils';

type ByTypeTransformers = ReturnType<typeof transformersByType>;

export type TextFormatTransformersIndex = Readonly<{
  fullMatchRegExpByTag: Readonly<Record<string, RegExp>>;
  openTagsRegExp: RegExp;
  transformersByTag: Readonly<Record<string, TextFormatTransformer>>;
}>;

/**
 * Renders markdown from a string. The selection is moved to the start after the operation.
 */
export function createMarkdownImport(
  transformers: Array<Transformer>,
  shouldPreserveNewLines = false,
): (markdownString: string, node?: ElementNode) => void {
  const byType = transformersByType(transformers);
  const textFormatTransformersIndex = createTextFormatTransformersIndex(
    byType.textFormat,
  );

  return (markdownString, node) => {
    const lines = markdownString.split('\n');
    const root = node || $getRoot();
    root.clear();

    $importLines(
      lines,
      root,
      byType,
      textFormatTransformersIndex,
      shouldPreserveNewLines,
    );

    const children = root.getChildren();
    for (const child of children) {
      // By default, removing empty paragraphs as md does not really
      // allow empty lines and uses them as delimiter.
      // If you need empty lines set shouldPreserveNewLines = true.
      if (
        !shouldPreserveNewLines &&
        isEmptyParagraph(child) &&
        root.getChildrenSize() > 1
      ) {
        child.remove();
        continue;
      }
      // Convert all '\t' into TabNode.
      if ($isElementNode(child)) {
        for (const textNode of child.getAllTextNodes()) {
          $normalizeMarkdownTextNode(textNode);
        }
      }
    }

    if ($getSelection() !== null) {
      root.selectStart();
    }
  };
}

/**
 * Imports an array of markdown lines into `rootNode`, running multiline and
 * block transformers line by line. Extracted so it can be called recursively to
 * import nested block structures (e.g. a fenced code block or blockquote nested
 * inside a list item).
 */
function $importLines(
  lines: Array<string>,
  rootNode: ElementNode,
  byType: ByTypeTransformers,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  shouldPreserveNewLines: boolean,
): void {
  const linesLength = lines.length;

  for (let i = 0; i < linesLength; i++) {
    const lineText = lines[i];

    if (!shouldPreserveNewLines) {
      // A blockquote or fenced code block indented under the current list item
      // is imported as a nested block child of that item rather than being
      // flattened to literal text / pulled out of the list.
      const nestedEndIndex = $importNestedListBlock(
        lines,
        i,
        rootNode,
        byType,
        textFormatTransformersIndex,
        shouldPreserveNewLines,
      );
      if (nestedEndIndex >= 0) {
        i = nestedEndIndex;
        continue;
      }
    }

    const [imported, shiftedIndex] = $importMultiline(
      lines,
      i,
      byType.multilineElement,
      rootNode,
    );

    if (imported) {
      // If a multiline markdown element was imported, we don't want to process the lines that were part of it anymore.
      // There could be other sub-markdown elements (both multiline and normal ones) matching within this matched multiline element's children.
      // However, it would be the responsibility of the matched multiline transformer to decide how it wants to handle them.
      // We cannot handle those, as there is no way for us to know how to maintain the correct order of generated lexical nodes for possible children.
      i = shiftedIndex; // Next loop will start from the line after the last line of the multiline element
      continue;
    }

    $importBlocks(
      lineText,
      rootNode,
      byType.element,
      textFormatTransformersIndex,
      byType.textMatch,
      shouldPreserveNewLines,
    );
  }
}

/**
 * Detects a blockquote or fenced code block that is indented under the current
 * list item and imports it (dedented) as a nested block child of that item.
 *
 * Nested lists keep their existing handling (indent → `ListItemNode.setIndent`),
 * so list-item lines are never consumed here.
 *
 * @returns the index of the last consumed line, or -1 when the lines at
 * `startIndex` are not a nested block under a list item.
 */
function $importNestedListBlock(
  lines: Array<string>,
  startIndex: number,
  rootNode: ElementNode,
  byType: ByTypeTransformers,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  shouldPreserveNewLines: boolean,
): number {
  const listNode = rootNode.getLastChild();
  if (!$isListNode(listNode)) {
    return -1;
  }

  const firstMatch = lines[startIndex].match(/^(\s+)(\S.*)$/);
  if (!firstMatch) {
    return -1;
  }
  const baseIndent = firstMatch[1].length;
  const firstDedented = firstMatch[2];

  // Only blockquotes and fenced code blocks are nested here; other indented
  // continuations keep their existing behavior.
  if (
    !(QUOTE_REGEX.test(firstDedented) || CODE_START_REGEX.test(firstDedented))
  ) {
    return -1;
  }

  const targetItem = $getDeepestLastListItem(listNode);
  if (targetItem == null || targetItem.getTextContentSize() === 0) {
    return -1;
  }

  // Gather consecutive indented lines (at least `baseIndent` deep) that are not
  // themselves list items, dedenting each by `baseIndent`.
  const subLines: Array<string> = [];
  let endIndex = startIndex;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s+)(\S.*)$/);
    if (
      !match ||
      match[1].length < baseIndent ||
      UNORDERED_LIST_REGEX.test(line) ||
      ORDERED_LIST_REGEX.test(line) ||
      CHECK_LIST_REGEX.test(line)
    ) {
      break;
    }
    subLines.push(line.slice(baseIndent));
    endIndex = i;
  }

  if (subLines.length === 0) {
    return -1;
  }

  // Import the dedented block into the list's container first, then move the
  // resulting block node(s) into the list item. Importing directly into the
  // list item does not work: ListItemNode.canMergeWith(ParagraphNode) unwraps
  // the intermediate paragraph that block transformers create. The dedented
  // lines are no longer indented, so this does not re-trigger nested handling.
  const beforeCount = rootNode.getChildrenSize();
  $importLines(
    subLines,
    rootNode,
    byType,
    textFormatTransformersIndex,
    shouldPreserveNewLines,
  );
  const importedNodes = rootNode.getChildren().slice(beforeCount);

  if (importedNodes.length === 0) {
    return -1;
  }

  // Separate the nested block from the list item's own content so it round-trips
  // back to an indented block on export.
  targetItem.append($createMarkdownLineBreakNode(targetItem));
  for (const importedNode of importedNodes) {
    targetItem.append(importedNode);
  }

  return endIndex;
}

function $getDeepestLastListItem(listNode: ElementNode): ListItemNode | null {
  const lastDescendant = listNode.getLastDescendant();
  if (lastDescendant == null) {
    return null;
  }
  return $findMatchingParent(lastDescendant, $isListItemNode);
}

/**
 *
 * @returns first element of the returned tuple is a boolean indicating if a multiline element was imported. The second element is the index of the last line that was processed.
 */
function $importMultiline(
  lines: Array<string>,
  startLineIndex: number,
  multilineElementTransformers: Array<MultilineElementTransformer>,
  rootNode: ElementNode,
): [boolean, number] {
  for (const transformer of multilineElementTransformers) {
    const {handleImportAfterStartMatch, regExpEnd, regExpStart, replace} =
      transformer;

    const startMatch = lines[startLineIndex].match(regExpStart);
    if (!startMatch) {
      continue; // Try next transformer
    }

    if (handleImportAfterStartMatch) {
      const result = handleImportAfterStartMatch({
        lines,
        rootNode,
        startLineIndex,
        startMatch,
        transformer,
      });
      if (result === null) {
        continue;
      } else if (result) {
        return result;
      }
    }

    const regexpEndRegex: RegExp | undefined =
      typeof regExpEnd === 'object' && 'regExp' in regExpEnd
        ? regExpEnd.regExp
        : regExpEnd;

    const isEndOptional =
      regExpEnd && typeof regExpEnd === 'object' && 'optional' in regExpEnd
        ? regExpEnd.optional
        : !regExpEnd;

    let endLineIndex = startLineIndex;
    const linesLength = lines.length;

    // check every single line for the closing match. It could also be on the same line as the opening match.
    while (endLineIndex < linesLength) {
      const endMatch = regexpEndRegex
        ? lines[endLineIndex].match(regexpEndRegex)
        : null;
      if (!endMatch) {
        if (
          !isEndOptional ||
          (isEndOptional && endLineIndex < linesLength - 1) // Optional end, but didn't reach the end of the document yet => continue searching for potential closing match
        ) {
          endLineIndex++;
          continue; // Search next line for closing match
        }
      }

      // Now, check if the closing match matched is the same as the opening match.
      // If it is, we need to continue searching for the actual closing match.
      if (
        endMatch &&
        startLineIndex === endLineIndex &&
        endMatch.index === startMatch.index
      ) {
        endLineIndex++;
        continue; // Search next line for closing match
      }

      // At this point, we have found the closing match. Next: calculate the lines in between open and closing match
      // This should not include the matches themselves, and be split up by lines
      const linesInBetween = [];

      if (endMatch && startLineIndex === endLineIndex) {
        linesInBetween.push(
          lines[startLineIndex].slice(
            startMatch[0].length,
            -endMatch[0].length,
          ),
        );
      } else {
        for (let i = startLineIndex; i <= endLineIndex; i++) {
          if (i === startLineIndex) {
            const text = lines[i].slice(startMatch[0].length);
            linesInBetween.push(text); // Also include empty text
          } else if (i === endLineIndex && endMatch) {
            const text = lines[i].slice(0, -endMatch[0].length);
            linesInBetween.push(text); // Also include empty text
          } else {
            linesInBetween.push(lines[i]);
          }
        }
      }

      if (
        replace(rootNode, null, startMatch, endMatch, linesInBetween, true) !==
        false
      ) {
        // Return here. This $importMultiline function is run line by line and should only process a single multiline element at a time.
        return [true, endLineIndex];
      }

      // The replace function returned false, despite finding the matching open and close tags => this transformer does not want to handle it.
      // Thus, we continue letting the remaining transformers handle the passed lines of text from the beginning
      break;
    }
  }

  // No multiline transformer handled this line successfully
  return [false, startLineIndex];
}

function $importBlocks(
  lineText: string,
  rootNode: ElementNode,
  elementTransformers: Array<ElementTransformer>,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: Array<TextMatchTransformer>,
  shouldPreserveNewLines: boolean,
) {
  const textNode = $createTextNode(lineText);
  const elementNode = $createParagraphNode();
  elementNode.append(textNode);
  rootNode.append(elementNode);

  // Recursive block-importer handed to element transformers so they can import
  // nested block structures (e.g. a blockquote inside a blockquote).
  const importBlock = (nestedLineText: string, targetNode: ElementNode) =>
    $importBlocks(
      nestedLineText,
      targetNode,
      elementTransformers,
      textFormatTransformersIndex,
      textMatchTransformers,
      shouldPreserveNewLines,
    );

  for (const {regExp, replace} of elementTransformers) {
    const match = lineText.match(regExp);

    if (match) {
      textNode.setTextContent(lineText.slice(match[0].length));
      if (
        replace(elementNode, [textNode], match, true, importBlock) !== false
      ) {
        break;
      }
    }
  }

  importTextTransformers(
    textNode,
    textFormatTransformersIndex,
    textMatchTransformers,
  );

  // If no transformer found and we left with original paragraph node
  // can check if its content can be appended to the previous node
  // if it's a paragraph, quote or list
  if (elementNode.isAttached() && lineText.length > 0) {
    const previousNode = elementNode.getPreviousSibling();
    if (
      !shouldPreserveNewLines && // Only append if we're not preserving newlines
      ($isParagraphNode(previousNode) ||
        $isQuoteNode(previousNode) ||
        $isListNode(previousNode))
    ) {
      let targetNode: typeof previousNode | ListItemNode | null = previousNode;

      if ($isListNode(previousNode)) {
        const lastDescendant = previousNode.getLastDescendant();
        if (lastDescendant == null) {
          targetNode = null;
        } else {
          targetNode = $findMatchingParent(lastDescendant, $isListItemNode);
        }
      }

      if (targetNode != null && targetNode.getTextContentSize() > 0) {
        targetNode.splice(targetNode.getChildrenSize(), 0, [
          $createMarkdownLineBreakNode(targetNode),
          ...elementNode.getChildren(),
        ]);
        elementNode.remove();
      }
    }
  }
}

// Look in node for '\t' and create a TabNode for each occurrence.
function $normalizeMarkdownTextNode(textNode: TextNode): void {
  const tabOffsets: Set<number> = new Set();
  const text = textNode.getTextContent();
  let index = text.indexOf('\t');

  // Find all tab occurrences
  while (index !== -1) {
    tabOffsets.add(index);
    tabOffsets.add(index + 1);
    index = text.indexOf('\t', index + 1);
  }

  // Split node to isolate each tab then replace '\t' into TabNode
  const splitNodes = textNode.splitText(...tabOffsets);
  splitNodes.forEach(node => {
    if (node.getTextContent() === '\t') {
      node.replace($createTabNode());
    }
  });
}

function createTextFormatTransformersIndex(
  textTransformers: Array<TextFormatTransformer>,
): TextFormatTransformersIndex {
  const transformersByTag: Record<string, TextFormatTransformer> = {};
  const fullMatchRegExpByTag: Record<string, RegExp> = {};
  const openTagsRegExp: string[] = [];

  for (const transformer of textTransformers) {
    const {tag} = transformer;
    transformersByTag[tag] = transformer;
    const tagRegExp = tag.replace(/(\*|\^|\+)/g, '\\$1');
    openTagsRegExp.push(tagRegExp);

    // Single-char tag (e.g. "*")
    if (tag.length === 1) {
      if (tag === '`') {
        // Capture the preceding character in group 1 (empty string at start-of-string
        // via the ^ branch) rather than using a negative lookbehind, which is not
        // supported in Safari < 16.4. Consumers must add match[1].length to
        // match.index to find the real start of the span (see importTextFormatTransformer.ts).
        fullMatchRegExpByTag[tag] = new RegExp(
          `(^|[^\\\\\`])(\`)((?:\\\\\`|[^\`])+?)(\`)(?!\`)`,
        );
      } else {
        fullMatchRegExpByTag[tag] = new RegExp(
          `(^|[^\\\\${tagRegExp}])(${tagRegExp})((\\\\${tagRegExp})?.*?[^${tagRegExp}\\s](\\\\${tagRegExp})?)(${tagRegExp})(?![\\\\${tagRegExp}])`,
        );
      }
    } else {
      // Multi-char tags (e.g. "**")
      fullMatchRegExpByTag[tag] = new RegExp(
        `(^|[^\\\\])(${tagRegExp})((\\\\${tagRegExp})?.*?[^\\s](\\\\${tagRegExp})?)(${tagRegExp})(?!\\\\)`,
      );
    }
  }

  return {
    // Reg exp to find open tag + content + close tag
    fullMatchRegExpByTag,

    // Regexp to locate *any* potential opening tag (longest first).
    // The former (?<!\\) escape guard has been removed — the delimiter
    // scanner's isEscaped() check handles escape filtering at match time.
    openTagsRegExp: new RegExp(`(${openTagsRegExp.join('|')})`, 'g'),
    transformersByTag,
  };
}
