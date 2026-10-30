/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isLinkNode} from '@lexical/link';
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
  type NodeKey,
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
import {isEmptyParagraph, transformersByType} from './utils';

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

  return node =>
    withLineStateCache(() => {
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
    });
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

  return exportedSelection =>
    withLineStateCache(() => {
      // Every node asks whether it is selected, which reads the selection's
      // nodes. A read-only selection doesn't cache them, so this works on a
      // copy that does, instead of recomputing them for every node.
      // Its direction is cached too, since slicing a node asks for it.
      const nodes = exportedSelection.getNodes();
      const selection = exportedSelection.clone();
      selection.setCachedNodes(nodes);
      if ($isRangeSelection(selection)) {
        selection._cachedIsBackward = exportedSelection.isBackward();
      }
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
    });
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

interface OpenTag {
  format: TextFormatType;
  tag: string;
  /** `$continuesTag`'s answers so far, by node key. */
  answers: Map<NodeKey, boolean>;
}

function $exportChildrenForSelection(
  node: ElementNode,
  selection: BaseSelection,
  textFormatTransformers: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  shouldPreserveNewLines: boolean,
  unclosedTags?: OpenTag[],
  unclosableTags?: OpenTag[],
): {shouldInclude: boolean; markdown: string} {
  const output = [];
  const children = node.getChildren();
  let anyChildIncluded = false;

  if (!unclosedTags) {
    unclosedTags = [];
  }
  if (!unclosableTags) {
    unclosableTags = [];
  }

  mainLoop: for (const child of children) {
    let childIncluded = child.isSelected(selection);

    // Try text match transformers (links, etc.)
    for (const transformer of textMatchTransformers) {
      if (!transformer.export) {
        continue;
      }

      const result = transformer.export(
        child,
        parentNode =>
          $exportChildrenForSelection(
            parentNode,
            selection,
            textFormatTransformers,
            textMatchTransformers,
            shouldPreserveNewLines,
            unclosedTags,
            [...unclosableTags, ...unclosedTags],
          ).markdown,
        textNode =>
          $exportTextFormat(
            textNode,
            $exportedText(textNode, selection),
            textFormatTransformers,
            unclosedTags,
            unclosableTags,
            shouldPreserveNewLines,
            selection,
          ),
      );

      if (result != null) {
        // Check extractWithChild if this node wasn't directly selected
        if (
          !childIncluded &&
          $isElementNode(child) &&
          child.getChildren().some(c => c.isSelected(selection)) &&
          child.extractWithChild(child, selection, 'html')
        ) {
          childIncluded = true;
        }
        if (childIncluded) {
          output.push(result);
          anyChildIncluded = true;
        }
        continue mainLoop;
      }
    }

    if ($isLineBreakNode(child)) {
      if (childIncluded) {
        output.push($exportLineBreak(child));
        anyChildIncluded = true;
      }
    } else if ($isTextNode(child)) {
      if (childIncluded) {
        output.push(
          $exportTextFormat(
            child,
            $exportedText(child, selection),
            textFormatTransformers,
            unclosedTags,
            unclosableTags,
            shouldPreserveNewLines,
            selection,
          ),
        );
        anyChildIncluded = true;
      }
    } else if ($isElementNode(child)) {
      const childResult = $exportChildrenForSelection(
        child,
        selection,
        textFormatTransformers,
        textMatchTransformers,
        shouldPreserveNewLines,
        unclosedTags,
        unclosableTags,
      );

      // extractWithChild: if child has selected descendants, ask parent if it should be included
      if (
        !childIncluded &&
        childResult.shouldInclude &&
        child.extractWithChild(child, selection, 'html')
      ) {
        childIncluded = true;
      }

      if (childIncluded || childResult.shouldInclude) {
        output.push(childResult.markdown);
        anyChildIncluded = true;
      }
    } else if ($isDecoratorNode(child)) {
      if (childIncluded) {
        output.push(child.getTextContent());
        anyChildIncluded = true;
      }
    }
  }

  return {markdown: output.join(''), shouldInclude: anyChildIncluded};
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
  textTransformersIndex: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  unclosedTags?: OpenTag[],
  unclosableTags?: OpenTag[],
  shouldPreserveNewLines: boolean = false,
): string {
  const output = [];
  const children = node.getChildren();
  // keep track of unclosed tags from the very beginning
  if (!unclosedTags) {
    unclosedTags = [];
  }
  if (!unclosableTags) {
    unclosableTags = [];
  }

  mainLoop: for (const child of children) {
    for (const transformer of textMatchTransformers) {
      if (!transformer.export) {
        continue;
      }

      const result = transformer.export(
        child,
        parentNode =>
          $exportChildren(
            parentNode,
            textTransformersIndex,
            textMatchTransformers,
            unclosedTags,
            // Add current unclosed tags to the list of unclosable tags - we don't want nested tags from
            // textmatch transformers to close the outer ones, as that may result in invalid markdown.
            // E.g. **text [text**](https://lexical.io)
            // is invalid markdown, as the closing ** is inside the link.
            //
            [...unclosableTags, ...unclosedTags],
            shouldPreserveNewLines,
          ),
        (textNode, textContent) =>
          $exportTextFormat(
            textNode,
            textContent,
            textTransformersIndex,
            unclosedTags,
            unclosableTags,
            shouldPreserveNewLines,
            null,
          ),
      );

      if (result != null) {
        output.push(result);
        continue mainLoop;
      }
    }

    if ($isLineBreakNode(child)) {
      output.push($exportLineBreak(child));
    } else if ($isTextNode(child)) {
      output.push(
        $exportTextFormat(
          child,
          child.getTextContent(),
          textTransformersIndex,
          unclosedTags,
          unclosableTags,
          shouldPreserveNewLines,
          null,
        ),
      );
    } else if ($isElementNode(child)) {
      // empty paragraph returns ""
      output.push(
        $exportChildren(
          child,
          textTransformersIndex,
          textMatchTransformers,
          unclosedTags,
          unclosableTags,
          shouldPreserveNewLines,
        ),
      );
    } else if ($isDecoratorNode(child)) {
      output.push(child.getTextContent());
    }
  }

  return output.join('');
}

function $exportLineBreak(node: LineBreakNode): string {
  return $getState(node, hardLineBreakState) + '\n';
}

function $exportTextFormat(
  node: TextNode,
  textContent: string,
  textTransformers: TextFormatTransformer[],
  // unclosed tags include the markdown tags that haven't been closed yet, and their associated formats
  unclosedTags: OpenTag[],
  unclosableTags: OpenTag[],
  shouldPreserveNewLines: boolean,
  // the selection being exported, which ends the text a tag can extend over
  selection: BaseSelection | null,
): string {
  // This function handles the case of a string looking like this: "   foo   "
  // Where it would be invalid markdown to generate: "**   foo   **"
  // so the tags go inside the whitespace instead: "   **foo**   ".

  const isCode = node.hasFormat('code');

  let output = textContent;
  if (!isCode) {
    // Preserve literal backslashes when preserving source newlines.
    // Default mode guards numeric references; named references keep legacy output.
    // Numeric escapes avoid changing emphasis flanking beside formatting.
    // Guard ambiguous '<' and '&' at node ends for constructs split across nodes.
    if (shouldPreserveNewLines) {
      output = output.replace(/([*_`~])/g, '\\$1');
    } else {
      output = $escapeLiteralBrackets(
        node,
        output.replace(/([*_`~\\]|<(?=\S|$)|&(?=#|$))/g, character =>
          /[*_`~\\]/.test(character)
            ? `\\${character}`
            : `&#${character.charCodeAt(0)};`,
        ),
        selection,
      );
    }
  }

  const holdsTag = canHoldTag(textContent);

  // the opening tags to be added to the result
  let openingTags = '';
  // the closing tags to be added to the result
  let closingTagsBefore = '';
  let closingTagsAfter = '';

  const prevNode = getTextSibling(node, true);

  const applied = new Set();

  for (const transformer of textTransformers) {
    const format = transformer.format[0];
    const tag = transformer.tag;

    // Inline code uses a content-derived fence handled below, not a static tag.
    if (format === 'code') {
      continue;
    }

    // dedup applied formats
    if (holdsTag && node.hasFormat(format) && !applied.has(format)) {
      applied.add(format);

      // append the tag to openingTags, if it's not applied to the previous nodes,
      // or the nodes before that (which would result in an unclosed tag).
      // A whitespace-only previous node with the format keeps the tag open
      // without emitting it, so it counts as applied here.
      if (
        !hasFormat(prevNode, format) ||
        !unclosedTags.find(element => element.tag === tag)
      ) {
        unclosedTags.push({answers: new Map(), format, tag});
        openingTags += tag;
      }
    }
  }

  // close any tags in the same order they were applied, if necessary
  for (let i = 0; i < unclosedTags.length; i++) {
    const nodeHasFormat = hasFormat(node, unclosedTags[i].format);
    // prevent adding closing tag if later text with the format will do it
    if (nodeHasFormat && $continuesTag(node, unclosedTags[i], selection)) {
      continue;
    }

    const unhandledUnclosedTags = [...unclosedTags]; // Shallow copy to avoid modifying the original array

    while (unhandledUnclosedTags.length > i) {
      const unclosedTag = unhandledUnclosedTags.pop();

      // If tag is unclosable, don't close it and leave it in the original array,
      // So that it can be closed when it's no longer unclosable
      if (
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
        } else {
          closingTagsAfter += unclosedTag.tag;
        }
      }
      // Mutate the original array to remove the closed tag
      unclosedTags.pop();
    }
    break;
  }
  if (isCode && textContent !== '') {
    // Inline code is an atomic literal span with a content-derived fence, so
    // its whitespace stays inside the fence and other formats wrap around it.
    const {fence, padded} = getCodeSpanDelimiter(textContent);
    output = fence + padded + fence;
  } else if (!holdsTag) {
    // If the node is entirely whitespace, we don't apply opening/closing tags
    // around it, but it must still output any closing tags.
    return closingTagsBefore + closingTagsAfter + output;
  }

  // Flanking Compliance: CommonMark flanking rules require formatting tags to be
  // adjacent to non-whitespace characters, so openingTags and closingTagsAfter
  // are placed INSIDE the whitespace boundaries!
  // (Trimming rather than a regex keeps this linear in long whitespace runs.)
  const trimmedStart = output.trimStart();
  const trimmedOutput = trimmedStart.trimEnd();
  const leadingSpace = output.slice(0, output.length - trimmedStart.length);
  const trailingSpace = trimmedStart.slice(trimmedOutput.length);
  return (
    closingTagsBefore +
    leadingSpace +
    openingTags +
    trimmedOutput +
    closingTagsAfter +
    trailingSpace
  );
}

/**
 * Escape only the literal brackets that would otherwise turn into Markdown
 * syntax, and leave every other bracket as typed, so `[1]` citations and
 * `array[0]` keep their exported text.
 *
 * Outside a link a bracket matters in three places, and escaping the `]` is
 * enough in each:
 *
 * - a `]` followed by `(` closes the text of an inline link or image
 *   (https://spec.commonmark.org/0.31.2/#inline-link);
 * - a `]` followed by `:` closes the label of a link reference definition
 *   when its `[` starts a line after at most three spaces, with no bracket in
 *   between (https://spec.commonmark.org/0.31.2/#link-reference-definitions);
 * - `[ ]`, `[x]` or `[]` at the start of a line, followed by whitespace, is
 *   read back as a check list item by `CHECK_LIST`, and as a task list item
 *   by GFM.
 *
 * Inside a link's text, brackets are allowed only as matched pairs
 * (https://spec.commonmark.org/0.31.2/#link-text), and a pair followed by `(`
 * would read as a nested link. Those brackets, and unmatched ones, are
 * escaped; other matched pairs stay as typed.
 *
 * The characters around this node come from the exported text next to it in
 * the same block, read through inline elements other than links, so a
 * construct split across text nodes or around a comment mark is still caught.
 * Where that text is unknown (a decorator) the bracket is escaped.
 */
function $escapeLiteralBrackets(
  node: TextNode,
  text: string,
  selection: BaseSelection | null,
): string {
  if (!/[[\]]/.test(text)) {
    return text;
  }
  const isInLink = $isInsideLink(node);
  const escaped = isInLink
    ? linkTextBracketsToEscape(text, $nextExportedChar(node, selection))
    : literalBracketsToEscape(
        $lineStateBefore(node, selection),
        text,
        $nextExportedChar(node, selection),
      );
  if (escaped.size === 0) {
    return text;
  }
  let output = '';
  for (let index = 0; index < text.length; index++) {
    output += escaped.has(index) ? `&#${text.charCodeAt(index)};` : text[index];
  }
  return output;
}

/** Stands for exported text that cannot be part of a label: a link. */
const BARRIER = '\u0001';
/** Stands for exported text this pass cannot see: a decorator. */
const UNKNOWN = '\u0002';
/**
 * How far a label's `]` can be from its `[`: 999 characters of label
 * (https://spec.commonmark.org/0.31.2/#link-label) and the `[` itself.
 */
const MAX_LABEL_DISTANCE = 1000;

/**
 * What the exported text so far in a block says about the next character:
 * whether only whitespace (or unknown text, which may be empty) precedes it on
 * its line and how much, and how far back the nearest `[`, link or unknown
 * text is, with the character after it and the whitespace before it on its
 * line (-1 when something else precedes it there).
 */
interface LineState {
  lineIsBlank: boolean;
  lineIndent: number;
  /** -1 when there is none within MAX_LABEL_DISTANCE. */
  openerDistance: number;
  openerChar: string;
  openerNext: string;
  openerIndent: number;
}

const BLOCK_START: LineState = {
  lineIndent: 0,
  lineIsBlank: true,
  openerChar: '',
  openerDistance: -1,
  openerIndent: -1,
  openerNext: '',
};

/** Advance `state` over one character of exported text, in place. */
function advanceLineState(state: LineState, character: string): void {
  if (state.openerDistance !== -1) {
    state.openerDistance++;
    if (state.openerDistance === 1) {
      state.openerNext = character;
    } else if (state.openerDistance > MAX_LABEL_DISTANCE) {
      state.openerDistance = -1;
    }
  }
  if (character === '\n') {
    state.lineIsBlank = true;
    state.lineIndent = 0;
    return;
  }
  if (character === '[' || character === BARRIER || character === UNKNOWN) {
    state.openerDistance = 0;
    state.openerChar = character;
    state.openerNext = '';
    state.openerIndent = state.lineIsBlank ? state.lineIndent : -1;
  }
  if (character === ' ' || character === '\t') {
    state.lineIndent++;
  } else if (character !== UNKNOWN) {
    state.lineIsBlank = false;
  }
}

function linkTextBracketsToEscape(text: string, nextChar: string): Set<number> {
  const escaped = new Set<number>();
  const openers: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '[') {
      openers.push(index);
    } else if (character === ']') {
      const opener = openers.pop();
      const after = index + 1 < text.length ? text[index + 1] : nextChar;
      if (opener === undefined) {
        escaped.add(index);
      } else if (after === '(' || after === UNKNOWN) {
        escaped.add(opener);
        escaped.add(index);
      }
    }
  }
  for (const opener of openers) {
    escaped.add(opener);
  }
  return escaped;
}

/**
 * The indexes in `text` of the `]` characters to escape outside a link, given
 * the state of the exported text before it in its block and the exported
 * character after it.
 */
function literalBracketsToEscape(
  before: LineState,
  text: string,
  nextChar: string,
): Set<number> {
  const escaped = new Set<number>();
  const state = {...before};
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === ']') {
      const after = index + 1 < text.length ? text[index + 1] : nextChar;
      // The distance to the nearest opener, counting this `]`.
      const distance =
        state.openerDistance === -1 ? -1 : state.openerDistance + 1;
      const label = distance === 2 ? state.openerNext : '';
      const atLineStart =
        distance !== -1 &&
        state.openerChar !== BARRIER &&
        state.openerIndent !== -1;
      const isUnknown = state.openerChar === UNKNOWN;
      if (
        after === '(' ||
        after === UNKNOWN ||
        (atLineStart &&
          after === ':' &&
          state.openerIndent <= 3 &&
          distance <= MAX_LABEL_DISTANCE) ||
        (atLineStart &&
          /\s/.test(after) &&
          (isUnknown || (distance <= 2 && /^\s?$|^[xX]$/.test(label))))
      ) {
        escaped.add(index);
      }
    }
    advanceLineState(state, character);
  }
  return escaped;
}

function $isInsideLink(node: LexicalNode): boolean {
  for (let parent = node.getParent(); parent; parent = parent.getParent()) {
    if ($isLinkNode(parent)) {
      return true;
    }
  }
  return false;
}

/** Whether `node` is an inline element whose exported text is its children's. */
function $isTransparentInline(node: LexicalNode | null): node is ElementNode {
  return $isElementNode(node) && node.isInline() && !$isLinkNode(node);
}

/**
 * The first character of the exported text after `node` in its block: text
 * read through inline elements other than links, `]` at the end of a link's
 * text, `[` where a link starts, a newline for a line break, a backtick for
 * inline code, and UNKNOWN for a decorator. Empty at the end of the block or
 * of the exported selection.
 */
function $nextExportedChar(
  node: LexicalNode,
  selection: BaseSelection | null,
): string {
  let current: LexicalNode = node;
  for (;;) {
    let next = current.getNextSibling();
    while (next === null) {
      const parent = current.getParent();
      if ($isLinkNode(parent)) {
        return ']';
      }
      if (!$isTransparentInline(parent)) {
        return '';
      }
      current = parent;
      next = current.getNextSibling();
    }
    while ($isTransparentInline(next) && next.getFirstChild() !== null) {
      next = next.getFirstChildOrThrow();
    }
    if (selection !== null && !next.isSelected(selection)) {
      return '';
    }
    if ($isTextNode(next)) {
      const exported = $exportedText(next, selection);
      if (exported !== '') {
        return next.hasFormat('code') ? '`' : exported[0];
      }
    } else if ($isLineBreakNode(next)) {
      return '\n';
    } else if ($isLinkNode(next)) {
      return '[';
    } else if (!$isElementNode(next)) {
      return UNKNOWN;
    }
    current = next;
  }
}

/**
 * The line state after each leaf exported so far, for the export in progress,
 * so that each leaf's text is read once however many brackets follow it.
 */
let lineStateCache: Map<NodeKey, LineState> | null = null;

function withLineStateCache<T>(callback: () => T): T {
  const previous = lineStateCache;
  lineStateCache = new Map();
  try {
    return callback();
  } finally {
    lineStateCache = previous;
  }
}

/**
 * The leaf exported just before `node` in its block, read through inline
 * elements other than links, or null at the start of the block or of the
 * exported selection.
 */
function $previousLeaf(
  node: LexicalNode,
  selection: BaseSelection | null,
): LexicalNode | null {
  let current: LexicalNode = node;
  let previous = current.getPreviousSibling();
  while (previous === null) {
    const parent = current.getParent();
    if (!$isTransparentInline(parent)) {
      return null;
    }
    current = parent;
    previous = current.getPreviousSibling();
  }
  while ($isTransparentInline(previous) && previous.getLastChild() !== null) {
    previous = previous.getLastChildOrThrow();
  }
  return selection !== null && !previous.isSelected(selection)
    ? null
    : previous;
}

/**
 * A leaf's exported text in the terms LineState reads: a line break as a
 * newline, inline code with its brackets and spaces masked, a link as BARRIER
 * and a decorator as UNKNOWN.
 */
function $leafText(leaf: LexicalNode, selection: BaseSelection | null): string {
  if ($isTextNode(leaf)) {
    const text = $exportedText(leaf, selection);
    return leaf.hasFormat('code') ? text.replace(/[[\] \t]/g, '`') : text;
  } else if ($isLineBreakNode(leaf)) {
    return '\n';
  } else if ($isLinkNode(leaf)) {
    return BARRIER;
  } else if ($isElementNode(leaf)) {
    return '';
  }
  return UNKNOWN;
}

function $lineStateBefore(
  node: LexicalNode,
  selection: BaseSelection | null,
): LineState {
  // Walk back to a leaf whose state is known, then read forward from it.
  const pending: LexicalNode[] = [];
  let state = BLOCK_START;
  for (
    let leaf = $previousLeaf(node, selection);
    leaf !== null;
    leaf = $previousLeaf(leaf, selection)
  ) {
    const cached = lineStateCache && lineStateCache.get(leaf.getKey());
    if (cached) {
      state = cached;
      break;
    }
    pending.push(leaf);
  }
  for (let index = pending.length - 1; index >= 0; index--) {
    const leaf = pending[index];
    const next = {...state};
    for (const character of $leafText(leaf, selection)) {
      advanceLineState(next, character);
    }
    if (lineStateCache) {
      lineStateCache.set(leaf.getKey(), next);
    }
    state = next;
  }
  return state;
}

function getTextSibling(node: TextNode, backward: boolean): TextNode | null {
  const sibling = backward ? node.getPreviousSibling() : node.getNextSibling();

  if ($isTextNode(sibling)) {
    return sibling;
  }

  return null;
}

/**
 * Whether `tag` carries on past `node`, which has its format, to exported
 * text that can hold it. Whitespace-only siblings cannot (the tag must close
 * before the space), so they are looked past while they keep the format.
 * Text outside the exported selection does not count. Every whitespace node
 * the walk passes over shares its answer, so that is remembered on the tag
 * and each run is walked once, whatever order its nodes are asked in.
 */
function $continuesTag(
  node: TextNode,
  tag: OpenTag,
  selection: BaseSelection | null,
): boolean {
  const {answers} = tag;
  const known = answers.get(node.getKey());
  if (known !== undefined) {
    return known;
  }
  const passed: TextNode[] = [];
  let next = getTextSibling(node, false);
  let result = false;
  while (
    next &&
    next.hasFormat(tag.format) &&
    (!selection || next.isSelected(selection))
  ) {
    const text = $exportedText(next, selection);
    if (canHoldTag(text)) {
      result = true;
      break;
    }
    // Markdown import matches a tag within one line.
    if (text.includes('\n')) {
      break;
    }
    // A whitespace node already answered for shares the answer.
    const passedAnswer = answers.get(next.getKey());
    if (passedAnswer !== undefined) {
      result = passedAnswer;
      break;
    }
    passed.push(next);
    next = getTextSibling(next, false);
  }
  answers.set(node.getKey(), result);
  for (const passedNode of passed) {
    answers.set(passedNode.getKey(), result);
  }
  return result;
}

/** The text of `node` that the export emits: its selected slice, if any. */
function $exportedText(node: TextNode, selection: BaseSelection | null) {
  return selection
    ? $sliceSelectedTextNodeContent(selection, node, 'clone').getTextContent()
    : node.getTextContent();
}

function hasFormat(
  node: LexicalNode | null | undefined,
  format: TextFormatType,
): boolean {
  return $isTextNode(node) && node.hasFormat(format);
}

/**
 * Whether exported text can carry a format's tag: CommonMark flanking rules
 * keep tags off whitespace.
 */
function canHoldTag(text: string): boolean {
  return /\S/.test(text);
}
