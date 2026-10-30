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
  isEmptyParagraph,
  isEscaped,
  isFlankedBy,
  PUNCTUATION_OR_SPACE,
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
): {shouldInclude: boolean; pieces: MarkdownPiece[]} {
  const output: MarkdownPiece[] = [];
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
          output.push(rawPiece(result));
          anyChildIncluded = true;
        }
        continue mainLoop;
      }
    }

    if ($isLineBreakNode(child)) {
      if (childIncluded) {
        output.push(rawPiece($exportLineBreak(child)));
        anyChildIncluded = true;
      }
    } else if ($isTextNode(child)) {
      if (childIncluded) {
        appendPieces(
          output,
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
        appendPieces(output, childResult.pieces);
        anyChildIncluded = true;
      }
    } else if ($isDecoratorNode(child)) {
      if (childIncluded) {
        output.push(textPiece(child.getTextContent()));
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
): MarkdownPiece[] {
  const output: MarkdownPiece[] = [];
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
        output.push(rawPiece(result));
        continue mainLoop;
      }
    }

    if ($isLineBreakNode(child)) {
      output.push(rawPiece($exportLineBreak(child)));
    } else if ($isTextNode(child)) {
      appendPieces(
        output,
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
      appendPieces(
        output,
        $exportChildPieces(
          child,
          textTransformersIndex,
          textMatchTransformers,
          unclosedTags,
          unclosableTags,
          shouldPreserveNewLines,
        ),
      );
    } else if ($isDecoratorNode(child)) {
      output.push(textPiece(child.getTextContent()));
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
): MarkdownPiece[] {
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
    output = shouldPreserveNewLines
      ? output.replace(/([*_`~])/g, '\\$1')
      : output.replace(/([[\]*_`~\\]|<(?=\S|$)|&(?=#|$))/g, character =>
          /[*_`~\\]/.test(character)
            ? `\\${character}`
            : toCharacterReference(character),
        );
  }

  const holdsTag = canHoldTag(textContent);

  // the opening tags to be added to the result
  const openingTags: MarkdownPiece[] = [];
  // the closing tags to be added to the result
  const closingTagsBefore: MarkdownPiece[] = [];
  const closingTagsAfter: MarkdownPiece[] = [];

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
        openingTags.push({kind: 'opener', value: tag});
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
          closingTagsBefore.push({kind: 'closer', value: unclosedTag.tag});
        } else {
          closingTagsAfter.push({kind: 'closer', value: unclosedTag.tag});
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
    return [...closingTagsBefore, ...closingTagsAfter, textPiece(output)];
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
  return [
    ...closingTagsBefore,
    textPiece(leadingSpace),
    ...openingTags,
    // Inline code is a literal span: a character reference would show as is.
    isCode ? rawPiece(trimmedOutput) : textPiece(trimmedOutput),
    ...closingTagsAfter,
    textPiece(trailingSpace),
  ];
}

/**
 * Exported inline Markdown, with the format markers kept apart from the text
 * until `joinPieces` can see the characters on both sides of each delimiter
 * run. A character reference can stand in for a character of `text`, which
 * is text and decorator content; `raw` is anything else, such as code spans,
 * line breaks and the output of transformers, whose syntax a reference could
 * break.
 */
interface MarkdownPiece {
  kind: 'text' | 'raw' | 'opener' | 'closer';
  value: string;
}

function textPiece(value: string): MarkdownPiece {
  return {kind: 'text', value};
}

function rawPiece(value: string): MarkdownPiece {
  return {kind: 'raw', value};
}

function appendPieces(output: MarkdownPiece[], pieces: MarkdownPiece[]) {
  for (const piece of pieces) {
    output.push(piece);
  }
}

function isMarker(piece: MarkdownPiece | undefined): boolean {
  return (
    piece !== undefined && (piece.kind === 'opener' || piece.kind === 'closer')
  );
}

// An unpaired surrogate reads back from a reference as U+FFFD. (U+0000 does
// too, but CommonMark reads a raw one as U+FFFD as well.)
const UNPAIRED_SURROGATE = /\p{Cs}/u;

/** Whether a character reference can stand in for `character` beside a marker. */
function isWordCharacter(character: string | undefined): boolean {
  return (
    character !== undefined &&
    !PUNCTUATION_OR_SPACE.test(character) &&
    !UNPAIRED_SURROGATE.test(character)
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
function joinPieces(pieces: MarkdownPiece[]): string {
  // Drop empty pieces and merge adjacent text, so that each run of markers
  // sits between the pieces whose characters a reader sees beside it.
  const merged: MarkdownPiece[] = [];
  for (const piece of pieces) {
    const last = merged[merged.length - 1];
    if (piece.value === '') {
      continue;
    } else if (last && !isMarker(piece) && last.kind === piece.kind) {
      merged[merged.length - 1] = {
        kind: last.kind,
        value: last.value + piece.value,
      };
    } else {
      merged.push(piece);
    }
  }
  const encodeStart: boolean[] = [];
  const encodeEnd: boolean[] = [];
  if (merged.some(isMarker)) {
    decideReferences(merged, encodeStart, encodeEnd);
  }
  let markdown = '';
  for (let index = 0; index < merged.length; index++) {
    const {kind} = merged[index];
    let {value} = merged[index];
    let start = '';
    let end = '';
    if (encodeStart[index]) {
      const first = characterAt(value, 0)!;
      start = toCharacterReference(first);
      value = value.slice(first.length);
    }
    if (encodeEnd[index] && value !== '') {
      const last = characterBefore(value, value.length)!;
      end = toCharacterReference(last);
      value = value.slice(0, -last.length);
    }
    // A backslash left unescaped (when preserving newlines) would escape what
    // follows it: a reference's `&`, a marker or raw output.
    if (
      kind === 'text' &&
      (end !== '' || index + 1 < merged.length) &&
      isEscaped(value, value.length)
    ) {
      value = value.slice(0, -1) + toCharacterReference('\\');
    }
    markdown += start + value + end;
  }
  return markdown;
}

/**
 * Marks the text pieces whose first or last character has to go out as a
 * reference for the marker run beside it to open or close.
 */
function decideReferences(
  merged: MarkdownPiece[],
  encodeStart: boolean[],
  encodeEnd: boolean[],
) {
  const runs: MarkerRun[] = [];
  // The run that follows and the run that precedes each piece, or -1.
  const runAfter: number[] = new Array(merged.length).fill(-1);
  const runBefore: number[] = new Array(merged.length).fill(-1);
  for (let start = 0; start < merged.length; start++) {
    if (!isMarker(merged[start])) {
      continue;
    }
    let end = start;
    while (isMarker(merged[end + 1])) {
      end++;
    }
    // Markers of one character form one delimiter run, and only the first
    // and the last delimiter run touch text.
    const groups: {closes: boolean; opens: boolean; value: string}[] = [];
    for (let i = start; i <= end; i++) {
      const {kind, value} = merged[i];
      let group = groups[groups.length - 1];
      if (!group || group.value[0] !== value[0]) {
        group = {closes: false, opens: false, value: ''};
        groups.push(group);
      }
      group.value += value;
      group.opens ||= kind === 'opener';
      group.closes ||= kind === 'closer';
    }
    const last = groups.length - 1;
    if (start > 0) {
      runAfter[start - 1] = runs.length;
    }
    if (end + 1 < merged.length) {
      runBefore[end + 1] = runs.length;
    }
    runs.push({
      after: end + 1,
      afterFirst: last > 0 ? groups[1].value[0] : undefined,
      before: start - 1,
      beforeLast: last > 0 ? groups[last - 1].value.slice(-1) : undefined,
      closes: groups[last].closes,
      opens: groups[0].opens,
    });
    start = end;
  }
  const isOneCharacter = merged.map(
    ({value}) => characterAt(value, 0)!.length === value.length,
  );
  const isText = (index: number) =>
    index >= 0 && index < merged.length && merged[index].kind === 'text';
  // A one-character piece written as a reference reads as punctuation at
  // both ends: `&#97;`.
  const isEncoded = (index: number) =>
    (encodeStart[index] || encodeEnd[index]) && isOneCharacter[index];
  const startChar = (index: number) =>
    index >= merged.length
      ? undefined
      : encodeStart[index] || isEncoded(index)
        ? '&'
        : characterAt(merged[index].value, 0);
  const endChar = (index: number) =>
    index < 0
      ? undefined
      : encodeEnd[index] || isEncoded(index)
        ? ';'
        : characterBefore(merged[index].value, merged[index].value.length);
  // Writing a one-character piece as a reference changes what the run on its
  // other side sees, so that run is decided again. Each piece changes at most
  // twice, so this stays linear.
  const pending = runs.map((_run, index) => index);
  while (pending.length > 0) {
    const {before, after, opens, closes, afterFirst, beforeLast} =
      runs[pending.pop()!];
    // A reference helps only where the run would flank if the character
    // beside it were punctuation.
    const charBefore = endChar(before);
    const charAfter = startChar(after);
    if (
      opens &&
      isText(before) &&
      isWordCharacter(charBefore) &&
      !isFlankedBy(afterFirst || charAfter, charBefore) &&
      isFlankedBy(afterFirst || charAfter, ';')
    ) {
      encodeEnd[before] = true;
      if (isEncoded(before) && runBefore[before] !== -1) {
        pending.push(runBefore[before]);
      }
    }
    if (
      closes &&
      isText(after) &&
      isWordCharacter(charAfter) &&
      !isFlankedBy(beforeLast || charBefore, charAfter) &&
      isFlankedBy(beforeLast || charBefore, '&')
    ) {
      encodeStart[after] = true;
      if (isEncoded(after) && runAfter[after] !== -1) {
        pending.push(runAfter[after]);
      }
    }
  }
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
