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
  PUNCTUATION,
  toCharacterReference,
  transformersByType,
  WHITESPACE,
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
    return resolveMarkers(output.join('\n'));
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
    return resolveMarkers(output.join('\n'));
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
    // Marker sentinels in the text go out as references, so that only the
    // markers this export writes read as markers.
    output = shouldPreserveNewLines
      ? output.replace(/([*_`~])|[\uFDD0-\uFDD2]/g, (character, marker) =>
          marker ? `\\${marker}` : toCharacterReference(character),
        )
      : output.replace(
          /([[\]*_`~\\]|<(?=\S|$)|&(?=#|$)|[\uFDD0-\uFDD2])/g,
          character =>
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
        openingTags += OPENER + tag + MARKER_END;
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
          closingTagsBefore += CLOSER + unclosedTag.tag + MARKER_END;
        } else {
          closingTagsAfter += CLOSER + unclosedTag.tag + MARKER_END;
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

// Format markers are written between sentinels, noncharacters that Unicode
// keeps for internal use, until the whole export is joined, so that
// `resolveMarkers` sees each run of markers beside the characters a reader
// will see, whichever node, element or transformer wrote them.
const OPENER = '\uFDD0';
const CLOSER = '\uFDD1';
const MARKER_END = '\uFDD2';
const MARKER_RUN = /((?:[\uFDD0\uFDD1][^\uFDD0-\uFDD2]*\uFDD2)+)/;
const MARKER = /([\uFDD0\uFDD1])([^\uFDD0-\uFDD2]*)\uFDD2/g;

function isWordCharacter(character: string | undefined): boolean {
  return (
    character !== undefined &&
    !WHITESPACE.test(character) &&
    !PUNCTUATION.test(character)
  );
}

/**
 * Removes the marker sentinels. A delimiter run between a word character and
 * punctuation can only open or close on the punctuation side (CommonMark
 * flanking), so plain `a` before a bold `*` cannot go out as `a**\***`. The
 * word character beside such a run goes out as a numeric reference instead,
 * whose `&` or `;` is punctuation: `&#97;**\***`.
 */
function resolveMarkers(markdown: string): string {
  // Text and marker runs alternate, starting and ending with text.
  const parts = markdown.split(MARKER_RUN);
  const encodeStart: boolean[] = [];
  const encodeEnd: boolean[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    // Markers of one character form one delimiter run; only the first and
    // the last of them touch text.
    const runs: {closes: boolean; markers: string; opens: boolean}[] = [];
    for (const [, kind, tag] of parts[i].matchAll(MARKER)) {
      let run = runs[runs.length - 1];
      if (!run || run.markers[0] !== tag[0]) {
        run = {closes: false, markers: '', opens: false};
        runs.push(run);
      }
      run.markers += tag;
      run.opens ||= kind === OPENER;
      run.closes ||= kind === CLOSER;
    }
    const markers = runs.map(run => run.markers);
    const first = runs[0];
    const last = runs[runs.length - 1];
    const before = characterBefore(parts[i - 1], parts[i - 1].length);
    const after = characterAt(parts[i + 1], 0);
    const afterFirst = runs.length > 1 ? markers[1][0] : after;
    const beforeLast =
      runs.length > 1 ? markers[runs.length - 2].slice(-1) : before;
    encodeEnd[i - 1] =
      first.opens &&
      isWordCharacter(before) &&
      afterFirst !== undefined &&
      PUNCTUATION.test(afterFirst);
    encodeStart[i + 1] =
      last.closes &&
      isWordCharacter(after) &&
      beforeLast !== undefined &&
      PUNCTUATION.test(beforeLast);
    parts[i] = markers.join('');
  }
  for (let i = 0; i < parts.length; i += 2) {
    let text = parts[i];
    let start = '';
    let end = '';
    const first = characterAt(text, 0);
    if (encodeStart[i] && first !== undefined) {
      start = toCharacterReference(first);
      text = text.slice(first.length);
    }
    const last = characterBefore(text, text.length);
    if (encodeEnd[i] && last !== undefined) {
      end = toCharacterReference(last);
      text = text.slice(0, -last.length);
    }
    parts[i] = start + text + end;
  }
  return parts.join('');
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
