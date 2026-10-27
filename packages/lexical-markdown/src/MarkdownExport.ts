/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isAutoLinkNode, $isLinkNode} from '@lexical/link';
import {$sliceSelectedTextNodeContent} from '@lexical/selection';
import {
  $getRoot,
  $getState,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  type BaseSelection,
  type ElementNode,
  type LexicalNode,
  type LineBreakNode,
  TEXT_TYPE_TO_FORMAT,
  type TextFormatType,
  type TextNode,
} from 'lexical';

import {
  type ElementTransformer,
  getCodeSpanDelimiter,
  hardLineBreakState,
  type MultilineElementTransformer,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from './MarkdownTransformers';
import {
  isEmptyParagraph,
  preservedLineBreakState,
  transformersByType,
} from './utils';

/**
 * Renders string from markdown. The selection is moved to the start after the operation.
 */
export function createMarkdownExport(
  transformers: Transformer[],
  shouldPreserveNewLines: boolean = false,
): (node?: ElementNode) => string {
  const byType = transformersByType(transformers);
  const elementTransformers = [...byType.multilineElement, ...byType.element];
  const isNewlineDelimited = !shouldPreserveNewLines;

  // Export only uses text formats that are responsible for single format
  // e.g. it will filter out *** (bold, italic) and instead use separate ** and *
  const textFormatTransformers = byType.textFormat
    .filter(transformer => transformer.format.length === 1)
    // Make sure all text transformers that contain 'code' in their format are at the end of the array. Otherwise, formatted code like
    // <strong><code>code</code></strong> will be exported as `**Bold Code**`, as the code format will be applied first, and the bold format
    // will be applied second and thus skipped entirely, as the code format will prevent any further formatting.
    .sort((a, b) => {
      return (
        Number(a.format.includes('code')) - Number(b.format.includes('code'))
      );
    });

  return node => {
    const output = [];
    const children = (node || $getRoot()).getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const result = $exportTopLevelElements(
        child,
        elementTransformers,
        textFormatTransformers,
        byType.textMatch,
        shouldPreserveNewLines,
      );

      if (result != null) {
        output.push(
          // separate consecutive group of texts with a line break: eg. ["hello", "world"] -> ["hello", "/nworld"]
          isNewlineDelimited &&
            i > 0 &&
            !isEmptyParagraph(child) &&
            !isEmptyParagraph(children[i - 1])
            ? '\n'.concat(result)
            : result,
        );
      }
    }
    // Ensure consecutive groups of texts are at least \n\n apart while each empty paragraph render as a newline.
    // Eg. ["hello", "", "", "hi", "\nworld"] -> "hello\n\n\nhi\n\nworld"
    return output.join('\n');
  };
}

/**
 * Creates a markdown export function that only exports selected content.
 * Uses a recursive structure similar to $appendNodesToHTML to support
 * extractWithChild for proper handling of partial selections within
 * inline elements like links.
 */
export function createSelectionMarkdownExport(
  transformers: Transformer[],
  shouldPreserveNewLines: boolean = false,
): (selection: BaseSelection) => string {
  const byType = transformersByType(transformers);
  const elementTransformers = [...byType.multilineElement, ...byType.element];
  const isNewlineDelimited = !shouldPreserveNewLines;

  const textFormatTransformers = byType.textFormat
    .filter(transformer => transformer.format.length === 1)
    .sort((a, b) => {
      return (
        Number(a.format.includes('code')) - Number(b.format.includes('code'))
      );
    });

  return selection => {
    const output = [];
    // The separator depends on the previously *emitted* block, not on the
    // previous root child: unselected children produce no output, so keying
    // off the child index would prefix a newline to the first emitted block
    // whenever the selection starts below the top of the document.
    let previousExported: LexicalNode | null = null;

    for (const child of $getRoot().getChildren()) {
      const {shouldInclude, markdown} = $processNodeForSelection(
        child,
        selection,
        elementTransformers,
        textFormatTransformers,
        byType.textMatch,
        shouldPreserveNewLines,
      );

      if (shouldInclude && markdown != null) {
        output.push(
          isNewlineDelimited &&
            previousExported !== null &&
            !isEmptyParagraph(child) &&
            !isEmptyParagraph(previousExported)
            ? '\n'.concat(markdown)
            : markdown,
        );
        previousExported = child;
      }
    }
    return output.join('\n');
  };
}

function $processNodeForSelection(
  node: LexicalNode,
  selection: BaseSelection,
  elementTransformers: (ElementTransformer | MultilineElementTransformer)[],
  textFormatTransformers: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  shouldPreserveNewLines: boolean,
): {shouldInclude: boolean; markdown: string | null} {
  let shouldInclude = node.isSelected(selection);

  // For element transformers (heading, quote, list, code block, etc.)
  for (const transformer of elementTransformers) {
    if (!transformer.export) {
      continue;
    }
    const result = transformer.export(
      node,
      node_ =>
        $exportChildrenForSelection(
          node_,
          selection,
          textFormatTransformers,
          textMatchTransformers,
          shouldPreserveNewLines,
        ).markdown,
      selection,
    );

    if (result != null) {
      if (!shouldInclude) {
        // Check if any descendant is selected
        if ($isElementNode(node)) {
          const childResult = $exportChildrenForSelection(
            node,
            selection,
            textFormatTransformers,
            textMatchTransformers,
            shouldPreserveNewLines,
          );
          if (childResult.shouldInclude) {
            shouldInclude = true;
          }
        }
      }
      return {markdown: result, shouldInclude};
    }
  }

  if ($isElementNode(node)) {
    const childResult = $exportChildrenForSelection(
      node,
      selection,
      textFormatTransformers,
      textMatchTransformers,
      shouldPreserveNewLines,
    );
    return {
      markdown: childResult.markdown,
      shouldInclude: shouldInclude || childResult.shouldInclude,
    };
  } else if ($isDecoratorNode(node)) {
    return {markdown: node.getTextContent(), shouldInclude};
  } else {
    return {markdown: null, shouldInclude};
  }
}

function $exportChildrenForSelection(
  node: ElementNode,
  selection: BaseSelection,
  textFormatTransformers: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  shouldPreserveNewLines: boolean,
  unclosedTags?: {format: TextFormatType; tag: string}[],
  unclosableTags?: {format: TextFormatType; tag: string}[],
): {shouldInclude: boolean; markdown: string} {
  return $renderChildren(
    node,
    textFormatTransformers,
    textMatchTransformers,
    shouldPreserveNewLines,
    unclosedTags,
    unclosableTags,
    selection,
  );
}

function $exportTopLevelElements(
  node: LexicalNode,
  elementTransformers: (ElementTransformer | MultilineElementTransformer)[],
  textTransformersIndex: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  shouldPreserveNewLines: boolean,
): string | null {
  for (const transformer of elementTransformers) {
    if (!transformer.export) {
      continue;
    }
    const result = transformer.export(node, _node =>
      $exportChildren(
        _node,
        textTransformersIndex,
        textMatchTransformers,
        undefined,
        undefined,
        shouldPreserveNewLines,
      ),
    );

    if (result != null) {
      return result;
    }
  }

  if ($isElementNode(node)) {
    return $exportChildren(
      node,
      textTransformersIndex,
      textMatchTransformers,
      undefined,
      undefined,
      shouldPreserveNewLines,
    );
  } else if ($isDecoratorNode(node)) {
    return node.getTextContent();
  } else {
    return null;
  }
}

function $exportChildren(
  node: ElementNode,
  textFormatTransformers: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  unclosedTags?: {format: TextFormatType; tag: string}[],
  unclosableTags?: {format: TextFormatType; tag: string}[],
  shouldPreserveNewLines: boolean = false,
): string {
  return $renderChildren(
    node,
    textFormatTransformers,
    textMatchTransformers,
    shouldPreserveNewLines,
    unclosedTags,
    unclosableTags,
  ).markdown;
}

/**
 * Classify each child once before combining literal code runs. Transparent
 * wrappers share this stream; a transformer's owned string or callback is a
 * boundary. Never look ahead through nodes a custom exporter may consume.
 */
function $renderChildren(
  node: ElementNode,
  textFormatTransformers: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  shouldPreserveNewLines: boolean,
  unclosedTags: {format: TextFormatType; tag: string}[] = [],
  unclosableTags: {format: TextFormatType; tag: string}[] = [],
  selection?: BaseSelection,
): {shouldInclude: boolean; markdown: string} {
  const output: string[] = [];
  let codeRun: {first: TextNode; last: TextNode; text: string} | null = null;

  const $flushCode = () => {
    if (codeRun !== null) {
      output.push(
        $exportTextFormat(
          codeRun.first,
          codeRun.text,
          textFormatTransformers,
          unclosedTags,
          unclosableTags,
          shouldPreserveNewLines,
          selection,
          codeRun.last,
        ),
      );
      codeRun = null;
    }
  };

  const $append = (parent: ElementNode): boolean => {
    let anyIncluded = false;
    mainLoop: for (const child of parent.getChildren()) {
      let included = selection === undefined || child.isSelected(selection);
      for (const transformer of textMatchTransformers) {
        if (!transformer.export) continue;
        const result = transformer.export(
          child,
          container => {
            $flushCode();
            return $renderChildren(
              container,
              textFormatTransformers,
              textMatchTransformers,
              shouldPreserveNewLines,
              unclosedTags,
              [...unclosableTags, ...unclosedTags],
              selection,
            ).markdown;
          },
          (textNode, textContent) => {
            $flushCode();
            const content = selection
              ? $sliceSelectedTextNodeContent(
                  selection,
                  textNode,
                  'clone',
                ).getTextContent()
              : textContent;
            return $exportTextFormat(
              textNode,
              content,
              textFormatTransformers,
              unclosedTags,
              unclosableTags,
              shouldPreserveNewLines,
              selection,
            );
          },
        );
        if (result !== null && result !== undefined) {
          if (
            selection &&
            !included &&
            $isElementNode(child) &&
            child
              .getChildren()
              .some(candidate => candidate.isSelected(selection)) &&
            child.extractWithChild(child, selection, 'html')
          ) {
            included = true;
          }
          if (included) {
            // An omitted node introduces no delimiter between ordinary runs.
            if (result !== '') {
              $flushCode();
              output.push(result);
            }
            anyIncluded = true;
          }
          continue mainLoop;
        }
      }
      if ($isElementNode(child)) {
        anyIncluded = $append(child) || included || anyIncluded;
      } else if (included) {
        anyIncluded = true;
        if ($isTextNode(child)) {
          const content = selection
            ? $sliceSelectedTextNodeContent(
                selection,
                child,
                'clone',
              ).getTextContent()
            : child.getTextContent();
          if (content === '') continue;
          if (child.hasFormat('code')) {
            if (
              codeRun !== null &&
              codeRun.first.getFormat() === child.getFormat()
            ) {
              codeRun.text += content;
              codeRun.last = child;
            } else {
              $flushCode();
              codeRun = {first: child, last: child, text: content};
            }
          } else {
            $flushCode();
            output.push(
              $exportTextFormat(
                child,
                content,
                textFormatTransformers,
                unclosedTags,
                unclosableTags,
                shouldPreserveNewLines,
                selection,
              ),
            );
          }
        } else {
          $flushCode();
          if ($isLineBreakNode(child)) output.push($exportLineBreak(child));
          else if ($isDecoratorNode(child)) output.push(child.getTextContent());
        }
      }
    }
    if (
      shouldPreserveNewLines &&
      !parent.isInline() &&
      $hasFollowingLine(parent) &&
      (!selection ||
        ((anyIncluded || parent.isSelected(selection)) &&
          $selectionIncludesLineEnding(parent, selection)))
    ) {
      const marker = $getState(parent, preservedLineBreakState);
      if (marker !== '') {
        $flushCode();
        output.push(marker);
      }
    }
    return anyIncluded;
  };
  const shouldInclude = $append(node);
  $flushCode();
  return {markdown: output.join(''), shouldInclude};
}

function $exportLineBreak(node: LineBreakNode): string {
  return $getState(node, hardLineBreakState) + '\n';
}

function $exportTextFormat(
  node: TextNode,
  textContent: string,
  textTransformers: TextFormatTransformer[],
  // unclosed tags include the markdown tags that haven't been closed yet, and their associated formats
  unclosedTags: {format: TextFormatType; tag: string}[],
  unclosableTags?: {format: TextFormatType; tag: string}[],
  shouldPreserveNewLines: boolean = false,
  selection?: BaseSelection,
  lastNode: TextNode = node,
): string {
  // This function handles the case of a string looking like this: "   foo   "
  // Where it would be invalid markdown to generate: "**   foo   **"
  // If the node has no format, we use the original text.
  // Otherwise, we escape leading and trailing whitespaces to their corresponding code points,
  // ensuring the returned string maintains its original formatting, e.g., "**&#32;&#32;&#32;foo&#32;&#32;&#32;**".

  const isCode = node.hasFormat('code');

  let output = textContent;
  if (!isCode) {
    // Escape literal introducers even when their syntax would be completed
    // by another node. This is deliberately local to text: transformer output,
    // link destinations, and code each have their own serialization rules.
    // Backslashes are literal in either newline mode; source hard breaks are
    // represented separately above and on LineBreakNodes.
    output = output.replace(/([&<[\]*_`~\\\r\n])/g, char =>
      char === '\r' ? '&#13;' : char === '\n' ? '&#10;' : '\\' + char,
    );
    const prefix = $getLinePrefix(node, selection);
    if (prefix === '') {
      output = output.replace(/^([#>+=-])/, '\\$1');
    }
    if (prefix !== null && /^\d{0,9}$/.test(prefix)) {
      output = output.replace(
        /^(\d*)([.)])/,
        (found, digits: string, delimiter: string) =>
          prefix.length + digits.length > 0 &&
          prefix.length + digits.length <= 9
            ? digits + '\\' + delimiter
            : found,
      );
    }
    // Delimiters next to punctuation do not flank a word. If a format starts
    // or ends on punctuation at a run boundary, write the neighbouring word
    // character as a reference so that the generated delimiter sees punctuation
    // on both sides. The decoded character is still ordinary text.
    const previous = $getAdjacentText(node, true);
    const next = $getAdjacentText(node, false);
    const chars = Array.from(textContent);
    const first = chars[0];
    const last = chars[chars.length - 1];
    if (
      first &&
      !/[\s\p{P}\p{S}]/u.test(first) &&
      previous &&
      (previous.getFormat() & ~node.getFormat() & ~TEXT_TYPE_TO_FORMAT.code) !==
        0 &&
      (previous.hasFormat('code') ||
        /[\p{P}\p{S}]$/u.test(previous.getTextContent()) ||
        $isReopenedRun(previous))
    ) {
      output = `&#${first.codePointAt(0)};` + output.slice(first.length);
    }
    if (
      last &&
      !/[\s\p{P}\p{S}]/u.test(last) &&
      next &&
      (next.getFormat() & ~node.getFormat() & ~TEXT_TYPE_TO_FORMAT.code) !==
        0 &&
      (next.hasFormat('code') || /^[\p{P}\p{S}]/u.test(next.getTextContent()))
    ) {
      // The first and last character may be the same encoded character.
      output =
        chars.length === 1
          ? `&#${last.codePointAt(0)};`
          : output.slice(0, -last.length) + `&#${last.codePointAt(0)};`;
    }
    // A literal ! immediately before a generated link must not make an image.
    if (output.endsWith('!') && $startsWithLink($getNextInline(node))) {
      output = output.slice(0, -1) + '\\!';
    }
  }

  let leadingSpace: string;
  let trimmedOutput: string;
  let trailingSpace: string;
  let isWhitespaceOnly: boolean;

  if (isCode) {
    // Inline code is an atomic literal span with a content-derived fence, so
    // its whitespace stays inside the fence and other formats wrap around it.
    const {fence, padded} = getCodeSpanDelimiter(textContent);
    leadingSpace = '';
    trailingSpace = '';
    trimmedOutput = fence + padded + fence;
    isWhitespaceOnly = false;
  } else {
    // Extract leading and trailing whitespaces.
    // CommonMark flanking rules require formatting tags to be adjacent to non-whitespace characters.
    const match = output.match(/^(\s*)(.*?)(\s*)$/s) || ['', '', output, ''];
    leadingSpace = match[1];
    trimmedOutput = match[2];
    trailingSpace = match[3];
    isWhitespaceOnly = trimmedOutput === '';
    if ($getLinePrefix(node, selection) === '') {
      leadingSpace = leadingSpace.replace(
        /[ \t]/g,
        char => `&#${char.charCodeAt(0)};`,
      );
    }
    const following = $getAdjacentInline(node, false);
    if (
      following === null ||
      $isLineBreakNode(following) ||
      (selection && !following.isSelected(selection))
    ) {
      trailingSpace = trailingSpace.replace(
        /[ \t]/g,
        char => `&#${char.charCodeAt(0)};`,
      );
      if (isWhitespaceOnly)
        output = output.replace(/[ \t]/g, char => `&#${char.charCodeAt(0)};`);
    }
  }

  // the opening tags to be added to the result
  let openingTags = '';
  // the closing tags to be added to the result
  let closingTagsBefore = '';
  let closingTagsAfter = '';

  const prevNode = $getTextSibling(node, true);
  const nextNode = $getTextSibling(lastNode, false);

  const applied = new Set();

  for (const transformer of textTransformers) {
    const format = transformer.format[0];
    let tag = transformer.tag;

    // Inline code uses a content-derived fence handled above, not a static tag.
    if (format === 'code') {
      continue;
    }

    // dedup applied formats
    // `checkHasFormat` reads the node's whole text, but the text being
    // exported may be a selection slice of it. When the slice is entirely
    // whitespace the tags are dropped by the early return below, so
    // registering them here would leave an unclosed tag for a later node to
    // close. In the full-document path `checkHasFormat` already rejects
    // whitespace-only nodes, so this guard only affects sliced content.
    if (
      !isWhitespaceOnly &&
      checkHasFormat(node, format) &&
      !applied.has(format)
    ) {
      applied.add(format);

      // append the tag to openingTags, if it's not applied to the previous nodes,
      // or the nodes before that (which would result in an unclosed tag)
      if (!unclosedTags.find(element => element.format === format)) {
        if (
          checkHasFormat(prevNode, format) &&
          (!selection ||
            $sliceSelectedTextNodeContent(selection, prevNode!, 'clone')
              .getTextContent()
              .trim() !== '')
        ) {
          // Reopening an overlapping format immediately after its old tags
          // were closed must not fuse the runs (e.g. three closing stars and
          // one opening star). Use the other registered delimiter family.
          const alternative = textTransformers.find(
            candidate =>
              candidate.format[0] === format && candidate.tag[0] !== tag[0],
          );
          tag = alternative ? alternative.tag : tag;
        }
        unclosedTags.push({format, tag});
        openingTags += tag;
      }
    }
  }

  // close any tags in the same order they were applied, if necessary
  for (let i = 0; i < unclosedTags.length; i++) {
    const nodeHasFormat = hasFormat(node, unclosedTags[i].format);
    const nextNodeHasFormat = hasFormat(nextNode, unclosedTags[i].format);

    // prevent adding closing tag if next sibling will do it
    if (nodeHasFormat && nextNodeHasFormat) {
      continue;
    }

    const unhandledUnclosedTags = [...unclosedTags]; // Shallow copy to avoid modifying the original array

    while (unhandledUnclosedTags.length > i) {
      const unclosedTag = unhandledUnclosedTags.pop();

      // If tag is unclosable, don't close it and leave it in the original array,
      // So that it can be closed when it's no longer unclosable
      if (
        unclosableTags &&
        unclosedTag &&
        unclosableTags.find(element => element.tag === unclosedTag.tag)
      ) {
        continue;
      }

      if (unclosedTag && typeof unclosedTag.tag === 'string') {
        if (!nodeHasFormat) {
          // Handles cases where the tag has not been closed before, e.g. if the previous node
          // was a text match transformer that did not account for closing tags of the next node (e.g. a link)
          closingTagsBefore += unclosedTag.tag;
        } else if (!nextNodeHasFormat) {
          closingTagsAfter += unclosedTag.tag;
        }
      }
      // Mutate the original array to remove the closed tag
      unclosedTags.pop();
    }
    break;
  }
  // If the node is entirely whitespace, we don't apply opening/closing tags around it.
  // However, it must still output closing tags from previous nodes.
  if (isWhitespaceOnly && !node.hasFormat('code')) {
    return (
      closingTagsBefore +
      ($getLinePrefix(node, selection) === ''
        ? output.replace(/[ \t]/g, char => `&#${char.charCodeAt(0)};`)
        : output)
    );
  }

  // Flanking Compliance: Notice how openingTags and closingTagsAfter are placed INSIDE the whitespace boundaries!
  return (
    closingTagsBefore +
    leadingSpace +
    openingTags +
    trimmedOutput +
    closingTagsAfter +
    trailingSpace
  );
}

/** A source line ending is selected only when the range extends past it. */
function $hasFollowingLine(node: LexicalNode): boolean {
  for (
    let current: LexicalNode | null = node;
    current;
    current = current.getParent()
  ) {
    if (current.getNextSibling()) return true;
  }
  return false;
}

function $selectionIncludesLineEnding(
  node: ElementNode,
  selection: BaseSelection,
): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }
  const end = selection.isBackward() ? selection.anchor : selection.focus;
  const endNode = end.getNode();
  let current: LexicalNode = node;
  for (let parent = current.getParent(); parent; parent = current.getParent()) {
    if (parent.is(endNode)) {
      return (
        end.type === 'element' && current.getIndexWithinParent() < end.offset
      );
    }
    current = parent;
  }
  return (
    !node.is(endNode) && !node.isParentOf(endNode) && node.isBefore(endNode)
  );
}

/** The next inline node in this block, including across inline wrappers. */
function $getNextInline(node: LexicalNode): LexicalNode | null {
  let current = node;
  while (!current.getNextSibling()) {
    const parent = current.getParent();
    if (!parent || !parent.isInline()) {
      return null;
    }
    current = parent;
  }
  return current.getNextSibling();
}

function $startsWithLink(node: LexicalNode | null): boolean {
  while ($isElementNode(node) && node.isInline() && !$isLinkNode(node)) {
    node = node.getFirstChild() || $getNextInline(node);
  }
  return $isLinkNode(node) && !$isAutoLinkNode(node);
}

/** Adjacent text through transparent inline wrappers, stopping at links. */
function $getAdjacentInline(
  node: LexicalNode,
  backward: boolean,
): LexicalNode | null {
  let current = node;
  for (;;) {
    const sibling = backward
      ? current.getPreviousSibling()
      : current.getNextSibling();
    if (sibling) {
      let candidate: LexicalNode | null = sibling;
      while (
        $isElementNode(candidate) &&
        candidate.isInline() &&
        !$isLinkNode(candidate)
      ) {
        const next: LexicalNode | null = backward
          ? candidate.getLastChild()
          : candidate.getFirstChild();
        if (!next) break;
        candidate = next;
      }
      if (
        $isElementNode(candidate) &&
        candidate.isInline() &&
        !$isLinkNode(candidate) &&
        candidate.getChildrenSize() === 0
      ) {
        current = candidate;
        continue;
      }
      return candidate;
    }
    const parent = current.getParent();
    if (!parent || !parent.isInline()) {
      return null;
    }
    if ($isLinkNode(parent)) return parent;
    current = parent;
  }
}

function $getAdjacentText(
  node: LexicalNode,
  backward: boolean,
): TextNode | null {
  const adjacent = $getAdjacentInline(node, backward);
  return $isTextNode(adjacent) ? adjacent : null;
}

function $getTextSibling(node: TextNode, backward: boolean): TextNode | null {
  return $getAdjacentText(node, backward);
}

/** A run resumed after an overlapping outer format had to close. */
function $isReopenedRun(node: TextNode): boolean {
  const format = node.getFormat();
  let previous = $getAdjacentText(node, true);
  while (previous && previous.getFormat() === format) {
    previous = $getAdjacentText(previous, true);
  }
  return (
    previous !== null &&
    (previous.getFormat() & format) !== 0 &&
    (previous.getFormat() & ~format) !== 0
  );
}

/** At most nine source digits can precede an ordered-list delimiter. */
function $getLinePrefix(
  node: TextNode,
  selection?: BaseSelection,
): string | null {
  let prefix = '';
  for (
    let previous = $getAdjacentInline(node, true);
    previous;
    previous = $getAdjacentInline(previous, true)
  ) {
    if (
      $isLineBreakNode(previous) ||
      (selection && !previous.isSelected(selection))
    )
      return prefix;
    if (!$isTextNode(previous)) return null;
    prefix =
      (selection
        ? $sliceSelectedTextNodeContent(
            selection,
            previous,
            'clone',
          ).getTextContent()
        : previous.getTextContent()) + prefix;
    if (prefix.length > 9 || /\D/.test(prefix)) return null;
  }
  return prefix;
}

function hasFormat(
  node: LexicalNode | null | undefined,
  format: TextFormatType,
): boolean {
  return $isTextNode(node) && node.hasFormat(format);
}

function checkHasFormat(n: TextNode | null, f: TextFormatType): boolean {
  if (!hasFormat(n, f)) {
    return false;
  }
  if (f === 'code') {
    return true;
  }
  if (n && /^\s*$/.test(n.getTextContent())) {
    return false;
  }
  return true;
}
