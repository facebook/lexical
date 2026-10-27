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
  $isTextNode,
  type BaseSelection,
  type ElementNode,
  type LexicalNode,
  type LineBreakNode,
  type TextFormatType,
  type TextNode,
} from 'lexical';

import {narrowLiteralEscapes} from './MarkdownEscaping';
import {
  CHECK_LIST,
  CODE,
  type ElementTransformer,
  getCodeSpanDelimiter,
  hardLineBreakState,
  HEADING,
  LINK,
  type MultilineElementTransformer,
  ORDERED_LIST,
  QUOTE,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
  UNORDERED_LIST,
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
  const nodeMemo = createExportMemo([
    ...elementTransformers,
    ...textMatchTransformers,
  ]);

  const childPreviews = new Map<
    ElementNode,
    {shouldInclude: boolean; markdown: string}
  >();
  const $selectedChildren = (container: ElementNode) => {
    let rendered = childPreviews.get(container);
    if (rendered === undefined) {
      rendered = $exportChildrenForSelection(
        container,
        selection,
        textFormatTransformers,
        textMatchTransformers,
        shouldPreserveNewLines,
        undefined,
        undefined,
        nodeMemo,
      );
      childPreviews.set(container, rendered);
    }
    return rendered;
  };

  // For element transformers (heading, quote, list, code block, etc.)
  for (const transformer of elementTransformers) {
    if (!transformer.export) {
      continue;
    }
    const result = transformer.export(
      node,
      node_ => $selectedChildren(node_).markdown,
      selection,
    );

    if (result != null) {
      if (!shouldInclude) {
        // Check if any descendant is selected
        if ($isElementNode(node)) {
          const childResult = $selectedChildren(node);
          if (childResult.shouldInclude) {
            shouldInclude = true;
          }
        }
      }
      return {markdown: result, shouldInclude};
    }
  }

  if ($isElementNode(node)) {
    const childResult = $selectedChildren(node);
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
  nodeMemo?: ExportMemo,
): {shouldInclude: boolean; markdown: string} {
  return $renderChildren(
    node,
    textFormatTransformers,
    textMatchTransformers,
    shouldPreserveNewLines,
    unclosedTags,
    unclosableTags,
    selection,
    nodeMemo,
  );
}

function $exportTopLevelElements(
  node: LexicalNode,
  elementTransformers: (ElementTransformer | MultilineElementTransformer)[],
  textTransformersIndex: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  shouldPreserveNewLines: boolean,
): string | null {
  const nodeMemo = createExportMemo([
    ...elementTransformers,
    ...textMatchTransformers,
  ]);
  const childPreviews = new Map<ElementNode, string>();
  const $children = (container: ElementNode) => {
    let markdown = childPreviews.get(container);
    if (markdown === undefined) {
      markdown = $exportChildren(
        container,
        textTransformersIndex,
        textMatchTransformers,
        undefined,
        undefined,
        shouldPreserveNewLines,
        nodeMemo,
      );
      childPreviews.set(container, markdown);
    }
    return markdown;
  };
  for (const transformer of elementTransformers) {
    if (!transformer.export) continue;
    const result = transformer.export(node, $children);
    if (result != null) return result;
  }

  if ($isElementNode(node)) {
    return $children(node);
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
  nodeMemo?: ExportMemo,
): string {
  return $renderChildren(
    node,
    textFormatTransformers,
    textMatchTransformers,
    shouldPreserveNewLines,
    unclosedTags,
    unclosableTags,
    undefined,
    nodeMemo,
  ).markdown;
}

type LiteralRun = {first: TextNode; last: TextNode; text: string};
type MarkdownPiece =
  | {type: 'literal'; run: LiteralRun}
  | {type: 'syntax'; markdown: string; inline: boolean}
  | {type: 'boundary'}
  | {type: 'group'; pieces: MarkdownPiece[]};
type ExportMemo = Map<
  LexicalNode,
  {shouldInclude: boolean; pieces: MarkdownPiece[]}
> & {conservativeBrackets: boolean};

function createExportMemo(transformers: Transformer[]): ExportMemo {
  const knownExporters = new Set<unknown>();
  for (const transformer of [
    CHECK_LIST,
    CODE,
    HEADING,
    LINK,
    ORDERED_LIST,
    QUOTE,
    UNORDERED_LIST,
  ]) {
    knownExporters.add(transformer.export);
  }
  // Opaque exporters can define document-wide reference labels. Keep the old
  // bracket protection in that case, including for text in other blocks.
  const conservativeBrackets = transformers.some(
    transformer =>
      'export' in transformer &&
      transformer.export &&
      !knownExporters.has(transformer.export),
  );
  return Object.assign(
    new Map<LexicalNode, {shouldInclude: boolean; pieces: MarkdownPiece[]}>(),
    {conservativeBrackets},
  );
}
type RenderedChildren = {
  shouldInclude: boolean;
  markdown: string;
  pieces: MarkdownPiece[];
};

type MarkdownFragment = {
  text: string;
  kind: 'literal' | 'syntax' | 'open' | 'close';
};

function appendTags(
  fragments: MarkdownFragment[],
  text: string,
  kind: 'open' | 'close',
): void {
  for (const tag of text.match(/([*_~])\1*|[^*_~]+/g) || []) {
    fragments.push({kind: /^[*_~]/.test(tag) ? kind : 'syntax', text: tag});
  }
}

function delimiterFlanking(
  left: string,
  right: string,
): {open: boolean; close: boolean} {
  const leftSpace = left === '' || /\s/u.test(left);
  const rightSpace = right === '' || /\s/u.test(right);
  const leftPunctuation = /[\p{P}\p{S}]/u.test(left);
  const rightPunctuation = /[\p{P}\p{S}]/u.test(right);
  return {
    close: !leftSpace && (!leftPunctuation || rightSpace || rightPunctuation),
    open: !rightSpace && (!rightPunctuation || leftSpace || leftPunctuation),
  };
}

// Repair only actual generated delimiters. References can affect a delimiter
// at either end of a one-character literal, so revisit its immediate neighbours.
function repairFormatBoundaries(
  fragments: MarkdownFragment[],
  inLink: boolean,
  conservativeBrackets: boolean,
): string {
  const parts = fragments.filter(part => part.text !== '');
  const pending = parts.flatMap((part, index) =>
    part.kind === 'open' || part.kind === 'close' ? [index] : [],
  );
  const queued = new Set(pending);
  const revisit = (index: number) => {
    if (
      parts[index] &&
      (parts[index].kind === 'open' || parts[index].kind === 'close') &&
      !queued.has(index)
    ) {
      queued.add(index);
      pending.push(index);
    }
  };
  while (pending.length > 0) {
    const index = pending.pop()!;
    queued.delete(index);
    const tag = parts[index];
    const left = parts[index - 1];
    const right = parts[index + 1];
    const before = left ? left.text.slice(-1) : '';
    const after = right ? right.text.slice(0, 1) : '';
    const {open, close} = delimiterFlanking(before, after);
    const underscore = tag.text[0] === '_';
    const canOpen =
      open && (!underscore || !close || /[\p{P}\p{S}]/u.test(before));
    const canClose =
      close && (!underscore || !open || /[\p{P}\p{S}]/u.test(after));
    if (tag.kind === 'open' && !canOpen && left && left.kind === 'literal') {
      const character = Array.from(left.text).pop()!;
      if (!/[\s\p{P}\p{S}]/u.test(character.slice(-1))) {
        left.text =
          left.text.slice(0, -character.length) +
          `&#${character.codePointAt(0)};`;
        revisit(index - 2);
        revisit(index);
      }
    }
    if (
      tag.kind === 'close' &&
      !canClose &&
      right &&
      right.kind === 'literal'
    ) {
      const character = Array.from(right.text)[0];
      if (!/[\s\p{P}\p{S}]/u.test(character.slice(0, 1))) {
        right.text =
          `&#${character.codePointAt(0)};` + right.text.slice(character.length);
        revisit(index);
        revisit(index + 2);
      }
    }
  }
  const escapes: number[] = [];
  let offset = 0;
  for (const part of parts) {
    if (part.kind === 'literal') {
      for (let index = 0; index < part.text.length; index++) {
        if (part.text[index] === '\\') {
          if ('&<[]#>+=-.)'.includes(part.text[index + 1] || '\0'))
            escapes.push(offset + index);
          index++;
        }
      }
    }
    offset += part.text.length;
  }
  return narrowLiteralEscapes(
    parts.map(part => part.text).join(''),
    escapes,
    inLink,
    conservativeBrackets,
  );
}

// Only whole, unchanged callback results are delegated back to the literal
// stream. A transformer that wraps or rewrites a result owns that Markdown.
function delegatedPieces(
  markdown: string,
  callbacks: RenderedChildren[],
): MarkdownPiece[] | null {
  if (callbacks.length === 0) return null;
  const candidates =
    callbacks.length === 1
      ? callbacks
      : [
          {
            markdown: callbacks.map(callback => callback.markdown).join(''),
            pieces: callbacks.flatMap(callback => callback.pieces),
          },
          ...callbacks,
        ];
  for (const callback of candidates) {
    if (markdown === callback.markdown) return callback.pieces;
  }
  return null;
}
type TextExportContext = {
  next: LiteralRun | null;
  linePrefix: string | null;
  atLineEnd: boolean;
  lastClosed: string;
  ownedPrefix?: string;
  fragments?: MarkdownFragment[];
};

/**
 * Classify exporters once, then serialize literal runs with their actual
 * emitted neighbours. Omitted nodes and transparent wrappers introduce no
 * syntax. Unchanged callback results remain semantic pieces; authored strings
 * are explicit stream boundaries.
 */
function $renderChildren(
  node: ElementNode,
  textFormatTransformers: TextFormatTransformer[],
  textMatchTransformers: TextMatchTransformer[],
  shouldPreserveNewLines: boolean,
  unclosedTags: {format: TextFormatType; tag: string}[] = [],
  unclosableTags: {format: TextFormatType; tag: string}[] = [],
  selection?: BaseSelection,
  nodeMemo: ExportMemo = createExportMemo(textMatchTransformers),
): RenderedChildren {
  const renderedFragments: MarkdownFragment[] = [];
  const pieces: MarkdownPiece[] = [];
  let pending: LiteralRun | null = null;
  let linePrefix: string | null = $isLinkNode(node) ? null : '';
  let lastClosed = '';

  const write = (value: string, rendered?: MarkdownFragment[]) => {
    if (rendered) renderedFragments.push(...rendered);
    else renderedFragments.push({kind: 'syntax', text: value});
    const ending = Math.max(value.lastIndexOf('\n'), value.lastIndexOf('\r'));
    const prefix =
      ending >= 0
        ? value.slice(ending + 1)
        : linePrefix === null
          ? null
          : linePrefix + value;
    linePrefix = prefix !== null && /^\d{0,9}$/.test(prefix) ? prefix : null;
  };
  const $flush = (
    next: LiteralRun | null,
    atLineEnd: boolean,
    ownedPrefix?: string,
  ) => {
    if (pending !== null) {
      const context: TextExportContext = {
        atLineEnd,
        fragments: [],
        lastClosed,
        linePrefix,
        next,
        ownedPrefix,
      };
      write(
        $exportTextFormat(
          pending.first,
          pending.text,
          textFormatTransformers,
          unclosedTags,
          unclosableTags,
          shouldPreserveNewLines,
          context,
        ),
        context.fragments,
      );
      lastClosed = context.lastClosed;
      pending = null;
    }
  };
  const $boundary = (record = true) => {
    if (record) pieces.push({type: 'boundary'});
    $flush(null, true);
    lastClosed = '';
  };
  const $writeOwned = (value: string, inline = false, record = true) => {
    if (value !== '') {
      if (record) pieces.push({inline, markdown: value, type: 'syntax'});
      $flush(null, !inline, value);
      write(value);
      lastClosed = /^[*_]$/.test(value.slice(-1)) ? value.slice(-1) : '';
    }
  };
  const $appendLiteral = (run: LiteralRun, record = true) => {
    if (run.text === '') return;
    if (record) pieces.push({run, type: 'literal'});
    if (
      pending !== null &&
      pending.first.getFormat() === run.first.getFormat()
    ) {
      pending.text += run.text;
      pending.last = run.last;
    } else {
      $flush(run, false);
      pending = {...run};
    }
  };
  const $appendPieces = (fragments: MarkdownPiece[], record = true) => {
    if (record) pieces.push({pieces: fragments, type: 'group'});
    for (const piece of fragments) {
      if (piece.type === 'literal') $appendLiteral(piece.run, false);
      else if (piece.type === 'syntax')
        $writeOwned(piece.markdown, piece.inline, false);
      else if (piece.type === 'group') $appendPieces(piece.pieces, false);
      else $boundary(false);
    }
  };

  const $append = (parent: ElementNode): boolean => {
    let anyIncluded = false;
    mainLoop: for (const child of parent.getChildren()) {
      const memoized = nodeMemo.get(child);
      if (memoized !== undefined) {
        $appendPieces(memoized.pieces);
        anyIncluded = memoized.shouldInclude || anyIncluded;
        continue;
      }
      const start = pieces.length;
      const $remember = (shouldInclude: boolean) => {
        // Keep fragments as a tree so nested previews share classification
        // without copying every descendant at every wrapper depth.
        const fragments = pieces.splice(start);
        pieces.push({pieces: fragments, type: 'group'});
        nodeMemo.set(child, {pieces: fragments, shouldInclude});
      };
      let included = selection === undefined || child.isSelected(selection);
      let fallback: RenderedChildren | undefined;
      const childPreviews = new Map<ElementNode, RenderedChildren>();
      for (const transformer of textMatchTransformers) {
        if (!transformer.export) continue;
        const inlineLink =
          transformer.export === LINK.export && $isLinkNode(child);
        const callbacks: RenderedChildren[] = [];
        const result = transformer.export(
          child,
          container => {
            let rendered = childPreviews.get(container);
            if (rendered === undefined) {
              rendered = $renderChildren(
                container,
                textFormatTransformers,
                textMatchTransformers,
                shouldPreserveNewLines,
                [],
                [],
                selection,
                nodeMemo,
              );
              childPreviews.set(container, rendered);
            }
            callbacks.push(rendered);
            if (container.is(child)) fallback = rendered;
            return rendered.markdown;
          },
          (textNode, textContent) => {
            const content = selection
              ? $sliceSelectedTextNodeContent(
                  selection,
                  textNode,
                  'clone',
                ).getTextContent()
              : textContent;
            const markdown = $exportTextFormat(
              textNode,
              content,
              textFormatTransformers,
              [],
              [],
              shouldPreserveNewLines,
            );
            callbacks.push({
              markdown,
              pieces: [
                {
                  run: {first: textNode, last: textNode, text: content},
                  type: 'literal',
                },
              ],
              shouldInclude: included,
            });
            return markdown;
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
          )
            included = true;
          if (included) {
            const delegated = delegatedPieces(result, callbacks);
            if (delegated !== null) $appendPieces(delegated);
            else $writeOwned(result, inlineLink);
            anyIncluded = true;
          }
          $remember(included);
          continue mainLoop;
        }
      }
      if ($isElementNode(child)) {
        if (!child.isInline()) $boundary();
        if (fallback) {
          $appendPieces(fallback.pieces);
          included = fallback.shouldInclude || included;
        } else included = $append(child) || included;
        anyIncluded = included || anyIncluded;
        if (!child.isInline()) $boundary();
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
          $appendLiteral({first: child, last: child, text: content});
        } else if ($isLineBreakNode(child)) {
          $writeOwned($exportLineBreak(child));
        } else if ($isDecoratorNode(child)) {
          $writeOwned(child.getTextContent());
        }
      }
      $remember(included);
    }
    return anyIncluded;
  };
  const shouldInclude = $append(node);
  $flush(null, !$isLinkNode(node));
  return {
    markdown: repairFormatBoundaries(
      renderedFragments,
      $isLinkNode(node),
      nodeMemo.conservativeBrackets,
    ),
    pieces,
    shouldInclude,
  };
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
  _shouldPreserveNewLines: boolean = false,
  context: TextExportContext = {
    atLineEnd: true,
    lastClosed: '',
    linePrefix: '',
    next: null,
  },
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
    const prefix = context.linePrefix;
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
    // A literal ! immediately before a generated link must not make an image.
    if (
      output.endsWith('!') &&
      context.ownedPrefix !== undefined &&
      context.ownedPrefix.startsWith('[')
    ) {
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
    if (context.linePrefix === '') {
      leadingSpace = leadingSpace.replace(
        /[ \t]/g,
        char => `&#${char.charCodeAt(0)};`,
      );
    }
    if (context.atLineEnd) {
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

  const nextNode = context.next === null ? null : context.next.first;

  const applied = new Set();

  for (const transformer of textTransformers) {
    const format = transformer.format[0];
    let tag = transformer.tag;

    // Inline code uses a content-derived fence handled above, not a static tag.
    if (format === 'code') {
      continue;
    }

    // Whitespace-only runs carry no formatting. Use the selected/combined
    // run content, not the whole text of an individual source node.
    if (!isWhitespaceOnly && node.hasFormat(format) && !applied.has(format)) {
      applied.add(format);

      // append the tag to openingTags, if it's not applied to the previous nodes,
      // or the nodes before that (which would result in an unclosed tag)
      if (!unclosedTags.find(element => element.format === format)) {
        if (context.lastClosed !== '' && context.lastClosed === tag[0]) {
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
    context.lastClosed = '';
    const whitespace =
      closingTagsBefore +
      (context.linePrefix === ''
        ? output.replace(/[ \t]/g, char => `&#${char.charCodeAt(0)};`)
        : output);
    if (context.fragments)
      context.fragments.push({kind: 'syntax', text: whitespace});
    return whitespace;
  }

  context.lastClosed =
    trailingSpace === '' && closingTagsAfter !== ''
      ? closingTagsAfter.slice(-1)
      : '';
  if (context.fragments) {
    appendTags(context.fragments, closingTagsBefore, 'close');
    context.fragments.push({kind: 'syntax', text: leadingSpace});
    appendTags(context.fragments, openingTags, 'open');
    context.fragments.push({
      kind: isCode ? 'syntax' : 'literal',
      text: trimmedOutput,
    });
    appendTags(context.fragments, closingTagsAfter, 'close');
    context.fragments.push({kind: 'syntax', text: trailingSpace});
  }
  // Formatting delimiters stay inside whitespace boundaries.
  return (
    closingTagsBefore +
    leadingSpace +
    openingTags +
    trimmedOutput +
    closingTagsAfter +
    trailingSpace
  );
}

function hasFormat(
  node: LexicalNode | null | undefined,
  format: TextFormatType,
): boolean {
  return $isTextNode(node) && node.hasFormat(format);
}
