/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
import {
  characterAt,
  characterBefore,
  getPortableEmphasisSides,
  isEmptyParagraph,
  isEscaped,
  isLetterForSomeReader,
  isPortablyFlankedBy,
  toCharacterReference,
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

  return exportedSelection => {
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
        joinPieces(
          $exportChildrenForSelection(
            node_,
            selection,
            textFormatTransformers,
            textMatchTransformers,
            shouldPreserveNewLines,
          ).pieces,
        ),
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
      markdown: joinPieces(childResult.pieces),
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
  output: MarkdownPieces = createPieces(),
): {shouldInclude: boolean; pieces: MarkdownPieces} {
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
          joinPieces(
            $exportChildrenForSelection(
              parentNode,
              selection,
              textFormatTransformers,
              textMatchTransformers,
              shouldPreserveNewLines,
              unclosedTags,
              [...unclosableTags, ...unclosedTags],
            ).pieces,
          ),
        textNode =>
          joinPieces(
            $exportTextFormat(
              textNode,
              $exportedText(textNode, selection),
              textFormatTransformers,
              unclosedTags,
              unclosableTags,
              shouldPreserveNewLines,
              selection,
            ),
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
          pushPiece(output, RAW, result);
          anyChildIncluded = true;
        }
        continue mainLoop;
      }
    }

    if ($isLineBreakNode(child)) {
      if (childIncluded) {
        pushPiece(output, RAW, $exportLineBreak(child));
        anyChildIncluded = true;
      }
    } else if ($isTextNode(child)) {
      if (childIncluded) {
        $exportTextFormat(
          child,
          $exportedText(child, selection),
          textFormatTransformers,
          unclosedTags,
          unclosableTags,
          shouldPreserveNewLines,
          selection,
          output,
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
        output,
      );

      // extractWithChild: if child has selected descendants, ask parent if it should be included
      if (
        !childIncluded &&
        childResult.shouldInclude &&
        child.extractWithChild(child, selection, 'html')
      ) {
        childIncluded = true;
      }

      // An element child writes pieces only when it has included ones.
      if (childIncluded || childResult.shouldInclude) {
        anyChildIncluded = true;
      }
    } else if ($isDecoratorNode(child)) {
      if (childIncluded) {
        pushPiece(output, TEXT, child.getTextContent());
        anyChildIncluded = true;
      }
    }
  }

  return {pieces: output, shouldInclude: anyChildIncluded};
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
  return joinPieces(
    $exportChildPieces(
      node,
      textTransformersIndex,
      textMatchTransformers,
      unclosedTags,
      unclosableTags,
      shouldPreserveNewLines,
    ),
  );
}

function $exportChildPieces(
  node: ElementNode,
  textTransformersIndex: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  unclosedTags?: OpenTag[],
  unclosableTags?: OpenTag[],
  shouldPreserveNewLines: boolean = false,
  output: MarkdownPieces = createPieces(),
): MarkdownPieces {
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
          joinPieces(
            $exportTextFormat(
              textNode,
              textContent,
              textTransformersIndex,
              unclosedTags,
              unclosableTags,
              shouldPreserveNewLines,
              null,
            ),
          ),
      );

      if (result != null) {
        pushPiece(output, RAW, result);
        continue mainLoop;
      }
    }

    if ($isLineBreakNode(child)) {
      pushPiece(output, RAW, $exportLineBreak(child));
    } else if ($isTextNode(child)) {
      $exportTextFormat(
        child,
        child.getTextContent(),
        textTransformersIndex,
        unclosedTags,
        unclosableTags,
        shouldPreserveNewLines,
        null,
        output,
      );
    } else if ($isElementNode(child)) {
      // empty paragraph returns ""
      $exportChildPieces(
        child,
        textTransformersIndex,
        textMatchTransformers,
        unclosedTags,
        unclosableTags,
        shouldPreserveNewLines,
        output,
      );
    } else if ($isDecoratorNode(child)) {
      pushPiece(output, TEXT, child.getTextContent());
    }
  }

  return output;
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
  // where the exported pieces go
  pieces: MarkdownPieces = createPieces(),
): MarkdownPieces {
  // This function handles the case of a string looking like this: "   foo   "
  // Where it would be invalid markdown to generate: "**   foo   **"
  // so the tags go inside the whitespace instead: "   **foo**   ".

  const isCode = node.hasFormat('code');

  let output = textContent;
  if (!isCode) {
    // Preserve literal backslashes when preserving source newlines, except
    // right before a character escaped here, where they would escape the
    // escape instead.
    // Default mode guards numeric references; named references keep legacy output.
    // Numeric escapes avoid changing emphasis flanking beside formatting.
    // Guard ambiguous '<' and '&' at node ends for constructs split across nodes.
    output = shouldPreserveNewLines
      ? output.replace(/\\+(?=[*_`~])|[*_`~]/g, escaped =>
          escaped[0] === '\\' ? escaped + escaped : `\\${escaped}`,
        )
      : output.replace(/([[\]*_`~\\]|<(?=\S|$)|&(?=#|$))/g, character =>
          /[*_`~\\]/.test(character)
            ? `\\${character}`
            : toCharacterReference(character),
        );
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
    pushPiece(pieces, CLOSER, closingTagsBefore + closingTagsAfter);
    pushPiece(pieces, TEXT, output);
    return pieces;
  }

  // Flanking Compliance: CommonMark flanking rules require formatting tags to be
  // adjacent to non-whitespace characters, so openingTags and closingTagsAfter
  // are placed INSIDE the whitespace boundaries!
  // Tags stay inside JavaScript whitespace, which holds CommonMark's and the
  // other characters some readers count as whitespace.
  // (Trimming rather than a regex keeps this linear in long whitespace runs.)
  const trimmedStart = output.trimStart();
  const trimmedOutput = trimmedStart.trimEnd();
  const leadingSpace = output.slice(0, output.length - trimmedStart.length);
  const trailingSpace = trimmedStart.slice(trimmedOutput.length);
  pushPiece(pieces, CLOSER, closingTagsBefore);
  pushPiece(pieces, TEXT, leadingSpace);
  pushPiece(pieces, OPENER, openingTags);
  // Inline code is a literal span: a character reference would show as is.
  pushPiece(pieces, isCode ? RAW : TEXT, trimmedOutput);
  pushPiece(pieces, CLOSER, closingTagsAfter);
  pushPiece(pieces, TEXT, trailingSpace);
  return pieces;
}

/**
 * Exported inline Markdown, with the format markers kept apart from the text
 * until `joinPieces` can see the characters on both sides of each delimiter
 * run: `values[i]` is a piece of the output and `kinds[i]` what it is. A
 * character reference can stand in for a character of `TEXT`, which is text
 * and decorator content; `RAW` is anything else, such as code spans, line
 * breaks and the output of transformers, whose syntax a reference could
 * break. `OPENER` and `CLOSER` are format markers.
 */
type PieceKind = typeof TEXT | typeof RAW | typeof OPENER | typeof CLOSER;

interface MarkdownPieces {
  kinds: PieceKind[];
  values: string[];
}

const TEXT = 0;
const RAW = 1;
const OPENER = 2;
const CLOSER = 3;

function createPieces(): MarkdownPieces {
  return {kinds: [], values: []};
}

// Adjacent text (and adjacent raw output) is merged, so that each run of
// markers sits between the pieces whose characters a reader sees beside it.
function pushPiece(pieces: MarkdownPieces, kind: PieceKind, value: string) {
  const {kinds, values} = pieces;
  const last = kinds.length - 1;
  if (value === '') {
    return;
  } else if (last >= 0 && kinds[last] === kind && !isMarker(kind)) {
    values[last] += value;
  } else {
    kinds.push(kind);
    values.push(value);
  }
}

function isMarker(kind: PieceKind | undefined): boolean {
  return kind === OPENER || kind === CLOSER;
}

// Characters a URL or email can hold: GFM ends an autolink at
// whitespace or `<`, and a URL's host and path may hold any other character.
// This takes in the backslash that escapes a marker too.
const LINK_END = /[\s\p{Cc}<]/u;
function isLinkCharacter(character: string): boolean {
  return !LINK_END.test(character);
}
// What starts a URL: `http://`, `https://` (and cmark-gfm's `ftp://`) with
// a host after it, which may start with an emoji but not with other ASCII
// punctuation than `-` and `_`, and `www.`, which micromark links with
// anything after it. GFM readers start `www.` only at the start of a run or
// after `*_~(`, and a scheme after anything but a letter.
const LINK_PREFIX = /(?:https?|ftp):\/\/(?![\s\p{Cc}!-,./:-@[-^`{-~])|www\./giu;
function startsLink(prefix: string, before: string): boolean {
  return /^w/i.test(prefix) ? '*_~('.includes(before) : !/[a-z]/i.test(before);
}
// Characters an email can hold (word characters, `.+@-`, and the backslash
// that escapes one), and what makes one: GFM needs a dot in its domain. An
// email takes in no format, and cmark-gfm finds it in the text with its
// references decoded, but micromark only where its `@` is written as is.
const ADDRESS_CHARACTER = /[\w.+@\\-]/;
const ADDRESS = /[\w.+-]@[\w-]+\.[\w-]/;
const LINKISH = /www\.|:\/\/|@/i;
// Characters that GFM readers leave out at the end of a URL.
const LINK_TRAIL = '?!.,:*_~';

// Characters that a reference does not stand in for everywhere: CommonMark
// readers and HTML decode references to control characters, unpaired
// surrogates and noncharacters as U+FFFD (or remap them).
const UNREFERENCEABLE = /[\p{Cc}\p{Cs}\p{Noncharacter_Code_Point}]/u;

/** Whether a character reference can stand in for `character` beside a marker. */
function isReferenceable(character: string | undefined): boolean {
  return (
    character !== undefined &&
    isLetterForSomeReader(character) &&
    !UNREFERENCEABLE.test(character)
  );
}

/** Adjacent markers, between the pieces at `before` and `after`. */
interface MarkerRun {
  before: number;
  after: number;
  /** Whether the first delimiter run opens a tag. */
  opens: boolean;
  /** Whether the last delimiter run closes a tag. */
  closes: boolean;
  /** The marker character after the first delimiter run, if any. */
  afterFirst: string | undefined;
  /** The marker character before the last delimiter run, if any. */
  beforeLast: string | undefined;
}

/**
 * Joins exported pieces into Markdown. A delimiter run between a word
 * character and punctuation can only open or close on the punctuation side
 * (CommonMark flanking), so plain `a` before a bold `*` cannot go out as
 * `a**\***`. The word character beside such a run goes out as a numeric
 * reference instead, whose `&` or `;` is punctuation: `&#97;**\***`.
 */
function joinPieces({kinds, values}: MarkdownPieces): string {
  if (kinds.every(kind => kind === TEXT)) {
    return values.join('');
  }
  const {encodeStart, encodeEnd} = decideReferences(kinds, values);
  const count = kinds.length;
  // How many code units of each piece go out as a reference at its start
  // and at its end, and whether the backslash before the end does.
  const startLengths = new Uint8Array(count);
  const endLengths = new Uint8Array(count);
  const escapesEnd = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    const value = values[index];
    if (encodeStart[index]) {
      startLengths[index] = characterAt(value, 0)!.length;
    }
    if (encodeEnd[index] && value.length > startLengths[index]) {
      endLengths[index] = characterBefore(value, value.length)!.length;
    }
    // A backslash left unescaped (when preserving newlines, or in decorator
    // text) would escape the reference, marker or raw punctuation written
    // after it, or end the line with a hard break.
    const bodyEnd = value.length - endLengths[index];
    escapesEnd[index] = Number(
      kinds[index] === TEXT &&
        (isMarker(kinds[index + 1]) ||
          (kinds[index + 1] === RAW && ESCAPABLE.test(values[index + 1]))) &&
        bodyEnd > startLengths[index] &&
        isEscaped(value, bodyEnd),
    );
  }
  const spoiled = findSpoiledLinks(kinds, values, (index, mark) => {
    mark(0, startLengths[index]);
    const end = values[index].length - endLengths[index];
    mark(end - escapesEnd[index], values[index].length);
  });
  let markdown = '';
  let next = 0;
  for (let index = 0, base = 0; index < count; index++) {
    const value = values[index];
    const end = value.length - endLengths[index] - escapesEnd[index];
    let from = startLengths[index];
    markdown += toReferences(value.slice(0, from));
    for (
      ;
      next < spoiled.length && spoiled[next] < base + value.length;
      next++
    ) {
      const at = spoiled[next] - base;
      markdown += value.slice(from, at) + toCharacterReference(value[at]);
      from = at + 1;
    }
    markdown +=
      value.slice(from, end) +
      toReferences(value.slice(end, end + escapesEnd[index])) +
      toReferences(value.slice(end + escapesEnd[index]));
    base += value.length;
  }
  return markdown;
}

// What a backslash before it escapes: ASCII punctuation or a line ending.
const ESCAPABLE = /^[!-/:-@[-`{-~\n\r]/;

// The character in `value`, if any, as a reference.
function toReferences(value: string): string {
  return value === '' ? '' : toCharacterReference(value);
}

/**
 * Raw output as the bare-URL scan sees it. It keeps whitespace and `<`, which
 * end a URL, `*_~(`, after which `www.` starts one, and ASCII letters, before
 * which no scheme starts one, as `x`, and is `#` elsewhere. So no URL starts
 * inside it, but one before it runs on into it, as GFM readers run a URL on
 * through a code span or a link.
 */
function maskRaw(value: string): string {
  return value.replace(/[a-z]/gi, 'x').replace(/[^\sx<*_~(]/g, '#');
}

/**
 * Finds the bare URLs and `www.` hosts that GFM readers would link in the
 * joined pieces, and that a reference would land in or that would take in
 * the markers, code span or other raw output after them: the reader would
 * keep the reference's characters in the link, or the markers and code as
 * text. Such a URL is spoiled instead, by writing the `.` of `www.` or the
 * `:` after its scheme as a reference, so that no reader links it and its
 * text and formats come through. So is a URL that a reference before it
 * would start. `markReferences` is given each text piece and a function that
 * marks the code units of it, from one offset to another, that go out as
 * references. Returns, in order, the code units of the joined text to write
 * as references, each in a text piece.
 */
function findSpoiledLinks(
  kinds: PieceKind[],
  values: string[],
  markReferences: (
    index: number,
    mark: (from: number, to: number) => void,
  ) => void,
): number[] {
  // Every URL and email starts with one of these.
  if (!values.some((value, i) => kinds[i] === TEXT && LINKISH.test(value))) {
    return [];
  }
  let text = '';
  const starts = new Uint32Array(values.length + 1);
  for (let i = 0; i < values.length; i++) {
    starts[i] = text.length;
    text += kinds[i] === RAW ? maskRaw(values[i]) : values[i];
  }
  starts[values.length] = text.length;
  const isReference = new Uint8Array(text.length);
  for (let i = 0; i < values.length; i++) {
    if (kinds[i] === TEXT) {
      markReferences(i, (from, to) =>
        isReference.fill(1, starts[i] + from, starts[i] + to),
      );
    }
  }
  // Running counts of referenced code units and of code units that are not
  // text, so that whether any lie in a span is a subtraction.
  const references = new Uint32Array(text.length + 1);
  const formats = new Uint32Array(text.length + 1);
  for (let i = 0, piece = 0; i < text.length; i++) {
    while (starts[piece + 1] <= i) {
      piece++;
    }
    references[i + 1] = references[i] + isReference[i];
    formats[i + 1] = formats[i] + Number(kinds[piece] !== TEXT);
  }
  const has = (sums: Uint32Array, from: number, to: number) =>
    from < to && sums[to] > sums[from];
  const spoiled: number[] = [];
  // A reference in an email would cut a micromark reader's link short, so
  // each `@` of one that holds a reference is spoiled.
  const spoilEmails = (from: number, to: number) => {
    for (let start = from; start < to; ) {
      let end = start;
      while (end < to && ADDRESS_CHARACTER.test(text[end])) {
        end++;
      }
      if (
        has(references, start, end) &&
        ADDRESS.test(text.slice(start, end).replace(/\\/g, ''))
      ) {
        for (let i = start; i < end; i++) {
          if (text[i] === '@' && !isReference[i] && !has(formats, i, i + 1)) {
            spoiled.push(i);
          }
        }
      }
      start = Math.max(end, start + 1);
    }
  };
  for (let start = 0; start < text.length; ) {
    let end = start;
    while (end < text.length && isLinkCharacter(text[end])) {
      end++;
    }
    if (end === start) {
      start++;
      continue;
    }
    // A URL runs to the end of the run, less the punctuation at its end. It
    // takes in a backslash before that punctuation, which then no longer
    // escapes it, so the punctuation can join the markers after it.
    let trimmed = end;
    while (trimmed > start && LINK_TRAIL.includes(text[trimmed - 1])) {
      trimmed--;
    }
    if (isEscaped(text, trimmed) && has(formats, trimmed, end)) {
      trimmed = end;
    }
    // Where the text that is not part of a URL starts, which may hold an
    // email, and where the next URL may start.
    let rest = start;
    for (const prefix of text.slice(start, end).matchAll(LINK_PREFIX)) {
      const at = start + prefix.index;
      if (at < rest) {
        continue;
      }
      // A reference before the prefix, or a spoiled `.` or `:`, puts `;`
      // there.
      const before = at > start ? text[at - 1] : '';
      const wasLink = at === start || startsLink(prefix[0], before);
      const isLink =
        at === start ||
        startsLink(
          prefix[0],
          isReference[at - 1] || spoiled[spoiled.length - 1] === at - 1
            ? ';'
            : before,
        );
      if (!isLink) {
        continue;
      }
      spoilEmails(rest, at);
      if (wasLink && !has(references, at, end) && !has(formats, at, trimmed)) {
        rest = end;
        break;
      }
      // A reference in the prefix spoils it already. A URL whose `.` or `:`
      // is a custom format's marker is left as it is.
      const spoil = at + prefix[0].search(/[.:]/);
      if (!has(references, at, at + prefix[0].length)) {
        if (has(formats, spoil, spoil + 1)) {
          rest = end;
          break;
        }
        spoiled.push(spoil);
      }
      rest = at + prefix[0].length;
    }
    spoilEmails(rest, end);
    start = end;
  }
  return spoiled;
}

/**
 * Walks the delimiter run at the edge of the markers from `from` to `to`,
 * forward when `step` is 1 and backward when it is -1. Returns whether a
 * marker of `kind` is part of that run, and the character past it within the
 * markers, if any.
 */
function scanDelimiterRun(
  kinds: PieceKind[],
  values: string[],
  from: number,
  to: number,
  step: 1 | -1,
  kind: PieceKind,
): [boolean, string | undefined] {
  const edge = values[from];
  const delimiter = edge[step === 1 ? 0 : edge.length - 1];
  let hasKind = false;
  for (let i = from; i !== to + step; i += step) {
    const value = values[i];
    for (
      let c = step === 1 ? 0 : value.length - 1;
      c >= 0 && c < value.length;
      c += step
    ) {
      if (value[c] !== delimiter) {
        return [hasKind, value[c]];
      }
      hasKind ||= kinds[i] === kind;
    }
  }
  return [hasKind, undefined];
}

/**
 * Marks the text pieces whose first or last character has to go out as a
 * reference for the marker run beside it to open or close.
 */
function decideReferences(
  kinds: PieceKind[],
  values: string[],
): {
  encodeStart: Uint8Array;
  encodeEnd: Uint8Array;
} {
  const count = kinds.length;
  const encodeStart = new Uint8Array(count);
  const encodeEnd = new Uint8Array(count);
  const runs: MarkerRun[] = [];
  // The run that follows and the run that precedes each piece, or -1.
  const runAfter = new Int32Array(count).fill(-1);
  const runBefore = new Int32Array(count).fill(-1);
  for (let start = 0; start < count; start++) {
    if (!isMarker(kinds[start])) {
      continue;
    }
    let end = start;
    while (isMarker(kinds[end + 1])) {
      end++;
    }
    // Markers of one character form one delimiter run, and only the first
    // and the last delimiter run touch text.
    const [opens, afterFirst] = scanDelimiterRun(
      kinds,
      values,
      start,
      end,
      1,
      OPENER,
    );
    const [closes, beforeLast] = scanDelimiterRun(
      kinds,
      values,
      end,
      start,
      -1,
      CLOSER,
    );
    if (start > 0) {
      runAfter[start - 1] = runs.length;
    }
    if (end + 1 < count) {
      runBefore[end + 1] = runs.length;
    }
    runs.push({
      after: end + 1,
      afterFirst,
      before: start - 1,
      beforeLast,
      closes,
      opens,
    });
    start = end;
  }
  const firstChar = (index: number) => characterAt(values[index], 0)!;
  const lastChar = (index: number) =>
    characterBefore(values[index], values[index].length)!;
  // A one-character piece written as a reference reads as punctuation at
  // both ends: `&#97;`.
  const isOneCharacter = (index: number) =>
    firstChar(index).length === values[index].length;
  const isEncoded = (index: number) =>
    (encodeStart[index] || encodeEnd[index]) && isOneCharacter(index);
  const startChar = (index: number) =>
    index >= count
      ? undefined
      : encodeStart[index] || isEncoded(index)
        ? '&'
        : firstChar(index);
  const endChar = (index: number) =>
    index < 0
      ? undefined
      : encodeEnd[index] || isEncoded(index)
        ? ';'
        : lastChar(index);
  // Whether the last (or first) character of the piece at `index` can go out
  // as a reference.
  const canReference = (index: number, atEnd: boolean): boolean =>
    index >= 0 &&
    index < count &&
    kinds[index] === TEXT &&
    isReferenceable(atEnd ? endChar(index) : startChar(index));
  // Writing a one-character piece as a reference makes its other edge
  // punctuation too. That can stop the delimiter run touching that edge from
  // flanking unless the piece past it is written as a reference as well, and
  // so on along a chain of one-character pieces. Where the chain ends at
  // something that cannot be (raw output, say), writing the first reference
  // would only trade one lost format for another, so it is not written.
  // Each piece's answer is remembered for each direction, so each piece is
  // walked at most twice. Raw output and unreferenceable characters stay
  // what they are. A remembered block could only lift if a piece on its
  // chain were later written as a reference from the other side, which takes
  // a run of one marker character that both closes and opens; then a
  // reference that would have kept a format is not written.
  // 0 while unknown, then 1 when it spreads and 2 when it is blocked.
  const spreads = [new Uint8Array(count), new Uint8Array(count)];
  const canSpread = (index: number, leftward: boolean): boolean => {
    const side = leftward ? 0 : 1;
    const visited: number[] = [];
    let result = true;
    for (let piece = index; ; ) {
      if (spreads[side][piece] !== 0) {
        result = spreads[side][piece] === 1;
        break;
      }
      visited.push(piece);
      const runIndex = (leftward ? runBefore : runAfter)[piece];
      if (runIndex === -1) {
        break;
      }
      const run = runs[runIndex];
      // Only a run of a single delimiter character touches both pieces.
      const isAffected = leftward
        ? run.opens && run.afterFirst === undefined
        : run.closes && run.beforeLast === undefined;
      const next = leftward ? run.before : run.after;
      const char = leftward ? endChar(next) : startChar(next);
      if (!isAffected || isPortablyFlankedBy(leftward ? '&' : ';', char)) {
        break;
      }
      if (!canReference(next, leftward)) {
        result = false;
        break;
      }
      if (!isOneCharacter(next)) {
        break;
      }
      piece = next;
    }
    for (const piece of visited) {
      spreads[side][piece] = result ? 1 : 2;
    }
    return result;
  };
  const isFree = (index: number, leftward: boolean) =>
    !isOneCharacter(index) || canSpread(index, leftward);
  // A reference helps only where the run could open (or close) if the
  // character beside it were punctuation. `_` between two letters cannot.
  const opensWithReference = ({
    opens,
    before,
    after,
    afterFirst,
  }: MarkerRun) => {
    if (!opens) {
      return false;
    }
    const marker = values[before + 1][0];
    const next = afterFirst || startChar(after);
    return (
      !getPortableEmphasisSides(marker, endChar(before), next).canOpen &&
      getPortableEmphasisSides(marker, ';', next).canOpen
    );
  };
  const closesWithReference = ({
    closes,
    before,
    after,
    beforeLast,
  }: MarkerRun) => {
    if (!closes) {
      return false;
    }
    const marker = values[after - 1][values[after - 1].length - 1];
    const previous = beforeLast || endChar(before);
    return (
      !getPortableEmphasisSides(marker, previous, startChar(after)).canClose &&
      getPortableEmphasisSides(marker, previous, '&').canClose
    );
  };
  // Text does not escape every tag character (the `=` of `==`, say), and one
  // right beside a marker of the same character would join its delimiter
  // run, so it goes out as a reference.
  for (let i = 0; i < count; i++) {
    const value = values[i];
    if (kinds[i] === TEXT) {
      if (
        isMarker(kinds[i + 1]) &&
        value[value.length - 1] === values[i + 1][0] &&
        !isEscaped(value, value.length - 1)
      ) {
        encodeEnd[i] = 1;
      }
      if (
        isMarker(kinds[i - 1]) &&
        value[0] === values[i - 1][values[i - 1].length - 1]
      ) {
        encodeStart[i] = 1;
      }
    }
  }
  const pending = runs.map((_run, index) => index);
  // Writing a one-character piece as a reference changes what the run on its
  // other side sees, so that run is decided again. Each piece changes at most
  // twice, so this stays linear.
  while (pending.length > 0) {
    const index = pending.pop()!;
    const run = runs[index];
    const {before, after} = run;
    if (
      opensWithReference(run) &&
      canReference(before, true) &&
      isFree(before, true)
    ) {
      encodeEnd[before] = 1;
      if (isEncoded(before) && runBefore[before] !== -1) {
        pending.push(runBefore[before]);
      }
    }
    if (
      closesWithReference(run) &&
      canReference(after, false) &&
      isFree(after, false)
    ) {
      encodeStart[after] = 1;
      // An opener that sees the same character, of a run that both closes
      // and opens, may now need its own reference.
      if (run.opens && run.afterFirst === undefined) {
        pending.push(index);
      }
      if (isEncoded(after) && runAfter[after] !== -1) {
        pending.push(runAfter[after]);
      }
    }
  }
  return {encodeEnd, encodeStart};
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
