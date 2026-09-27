/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {$isCodeNode, type CodeNode} from '@lexical/code-core';
import {
  namedSignals,
  type NamedSignalsOutput,
  type Signal,
  signal,
} from '@lexical/extension';
import {
  $createParagraphNode,
  $createRangeSelection,
  $findMatchingParent,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  defineExtension,
  type ElementNode,
  KEY_ESCAPE_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  type NodeKey,
  PASTE_COMMAND,
  PASTE_TAG,
  type PointType,
  type RangeSelection,
  safeCast,
} from 'lexical';

import {$generateNodesFromMarkdownString} from './MarkdownImport';
import {type Transformer, TRANSFORMERS} from './MarkdownTransformers';

/**
 * A position in the document, recorded by key so that it can outlive the
 * update it was taken in. See {@link MarkdownPasteOffer}.
 */
export interface MarkdownPastePoint {
  readonly key: NodeKey;
  readonly offset: number;
  readonly type: 'text' | 'element';
}

/**
 * A paste whose plain text looks like Markdown, which
 * {@link CONVERT_PASTED_MARKDOWN_COMMAND} can replace with the Markdown
 * imported as rich text.
 */
export interface MarkdownPasteOffer {
  /** The `text/plain` payload of the paste. */
  readonly markdown: string;
  /** Where the pasted content starts. */
  readonly start: MarkdownPastePoint;
  /** Where the pasted content ends, which is where the caret was left. */
  readonly end: MarkdownPastePoint;
}

/**
 * Configuration for {@link MarkdownPasteExtension}.
 */
export interface MarkdownPasteConfig {
  /** When `true`, pastes are never offered for conversion. */
  disabled: boolean;
  /**
   * The transformers used to import the Markdown. Transformers whose node
   * dependencies are not registered on the editor are skipped, so the
   * default {@link TRANSFORMERS} is safe to use with any set of nodes.
   */
  transformers: Transformer[];
  /**
   * Passed to {@link $generateNodesFromMarkdownString}: keep every new line
   * of the pasted text as a paragraph break.
   */
  shouldPreserveNewLines: boolean;
  /**
   * Passed to {@link $generateNodesFromMarkdownString}: merge adjacent
   * non-empty lines into one paragraph, following CommonMark.
   */
  shouldMergeAdjacentLines: boolean;
  /**
   * Whether the pasted plain text looks like Markdown, so that the paste is
   * offered for conversion. Defaults to {@link looksLikeMarkdown}.
   */
  isMarkdown: (text: string) => boolean;
}

/**
 * Output of {@link MarkdownPasteExtension}.
 */
export interface MarkdownPasteOutput extends NamedSignalsOutput<MarkdownPasteConfig> {
  /**
   * The paste currently offered for conversion, or `null`. It is cleared by
   * the next change to the document or the selection, by Escape, and by
   * {@link CONVERT_PASTED_MARKDOWN_COMMAND} or
   * {@link DISMISS_PASTED_MARKDOWN_COMMAND}.
   */
  offer: Signal<MarkdownPasteOffer | null>;
}

/**
 * Replace the content of the pending {@link MarkdownPasteOffer} with its
 * Markdown imported as rich text. Handled by {@link MarkdownPasteExtension};
 * does nothing when there is no offer.
 */
export const CONVERT_PASTED_MARKDOWN_COMMAND: LexicalCommand<void> =
  createCommand('CONVERT_PASTED_MARKDOWN_COMMAND');

/**
 * Drop the pending {@link MarkdownPasteOffer}, keeping the paste as it is.
 */
export const DISMISS_PASTED_MARKDOWN_COMMAND: LexicalCommand<void> =
  createCommand('DISMISS_PASTED_MARKDOWN_COMMAND');

const FENCE = /^ {0,3}(?:`{3,}|~{3,})/;
const HEADING = /^ {0,3}#{1,6}[ \t]+\S/;
const QUOTE = /^ {0,3}>[ \t]?\S/;
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+\S/;
const TABLE_DIVIDER =
  /^ {0,3}\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$/;
const INLINE = [
  // **strong** and __strong__
  /\*\*[^\s*](?:[^*\n]*[^\s*])?\*\*/g,
  /(?:^|[^\w_])__[^\s_](?:[^_\n]*[^\s_])?__(?![\w_])/g,
  // *emphasis* and _emphasis_, not inside words like snake_case
  /(?:^|[^\w*])\*[^\s*](?:[^*\n]*[^\s*])?\*(?![\w*])/g,
  /(?:^|[^\w_])_[^\s_](?:[^_\n]*[^\s_])?_(?![\w_])/g,
  // ~~strikethrough~~
  /~~[^\s~](?:[^~\n]*[^\s~])?~~/g,
  // `code`
  /`[^`\n]+`/g,
  // [link](url) and ![image](url)
  /\[[^\]\n]+\]\([^)\s]+(?:[ \t]+"[^"\n]*")?\)/g,
];

/**
 * The default {@link MarkdownPasteConfig.isMarkdown} check. Text looks like
 * Markdown when it has a heading, a block quote, a fenced code block, a
 * table, or at least two list items, or else at least two inline constructs
 * (emphasis, strikethrough, code spans, links). A lone `*` or a single line
 * starting with `1.` is not enough.
 */
export function looksLikeMarkdown(text: string): boolean {
  let listItems = 0;
  let fences = 0;
  for (const line of text.split(/\r?\n/)) {
    if (HEADING.test(line) || QUOTE.test(line) || TABLE_DIVIDER.test(line)) {
      return true;
    }
    if (FENCE.test(line) && ++fences === 2) {
      return true;
    }
    if (LIST_ITEM.test(line) && ++listItems === 2) {
      return true;
    }
  }
  let inline = 0;
  for (const regExp of INLINE) {
    inline += (text.match(regExp) || []).length;
    if (inline >= 2) {
      return true;
    }
  }
  return false;
}

/**
 * A point equivalent to `point` that survives content being inserted at
 * `point`. The insertion can merge a text node that starts at the point into
 * the pasted text before it, or replace an empty block the point is in, so a
 * point at the start of a node is moved to the end of what precedes it, or to
 * the position of its block within the nearest root or shadow root.
 */
function $pointBeforeInsertion(point: PointType): MarkdownPastePoint | null {
  if (point.type === 'text' && point.offset > 0) {
    return {key: point.key, offset: point.offset, type: 'text'};
  }
  const node = point.getNode();
  let parent: ElementNode | null;
  let index: number;
  if (point.type === 'text') {
    parent = node.getParent();
    index = node.getIndexWithinParent();
  } else {
    parent = node as ElementNode;
    index = point.offset;
  }
  while (parent !== null) {
    const previous = index > 0 ? parent.getChildAtIndex(index - 1) : null;
    if ($isTextNode(previous)) {
      return {
        key: previous.getKey(),
        offset: previous.getTextContentSize(),
        type: 'text',
      };
    }
    if (previous !== null || $isRootOrShadowRoot(parent)) {
      return {key: parent.getKey(), offset: index, type: 'element'};
    }
    index = parent.getIndexWithinParent();
    parent = parent.getParent();
  }
  return null;
}

/**
 * Resolve a recorded point in the current editor state. An element point
 * before a child is moved to the start of that child, so that selection
 * operations work within blocks rather than on their parent.
 */
function $resolvePoint(
  point: MarkdownPastePoint,
): [NodeKey, number, 'text' | 'element'] | null {
  const node = $getNodeByKey(point.key);
  if (node === null || !node.isAttached()) {
    return null;
  }
  if (point.type === 'text') {
    return $isTextNode(node) && point.offset <= node.getTextContentSize()
      ? [point.key, point.offset, 'text']
      : null;
  }
  if (!$isElementNode(node) || point.offset > node.getChildrenSize()) {
    return null;
  }
  let child: LexicalNode | null = node.getChildAtIndex(point.offset);
  if (child === null) {
    return [point.key, point.offset, 'element'];
  }
  while ($isElementNode(child)) {
    const first: LexicalNode | null = child.getFirstChild();
    if (first === null) {
      return [child.getKey(), 0, 'element'];
    }
    child = first;
  }
  if ($isTextNode(child)) {
    return [child.getKey(), 0, 'text'];
  }
  return [
    child.getParentOrThrow().getKey(),
    child.getIndexWithinParent(),
    'element',
  ];
}

function withoutWhitespace(text: string): string {
  return text.replace(/\s+/g, '');
}

function $getOutermostCodeNode(node: LexicalNode): CodeNode | null {
  let code = $findMatchingParent(node, $isCodeNode);
  for (
    let parent = code && code.getParent();
    $isCodeNode(parent);
    parent = parent.getParent()
  ) {
    code = parent;
  }
  return code;
}

/**
 * Put an empty paragraph in place of `code`, or next to it, and select it.
 */
function $replaceWithParagraph(
  code: CodeNode,
  where: 'replace' | 'before' | 'after',
): void {
  const paragraph = $createParagraphNode();
  if (where === 'replace') {
    code.replace(paragraph);
  } else if (where === 'before') {
    code.insertBefore(paragraph);
  } else {
    code.insertAfter(paragraph);
  }
  paragraph.select();
}

/**
 * The range covered by `offer`, if it still holds the pasted text: its text
 * must equal the Markdown apart from whitespace. That also leaves out pastes
 * whose HTML already rendered the Markdown, where there is nothing left to
 * convert.
 */
function $getOfferRange(offer: MarkdownPasteOffer): RangeSelection | null {
  const start = $resolvePoint(offer.start);
  const end = $resolvePoint(offer.end);
  if (start === null || end === null) {
    return null;
  }
  const range = $createRangeSelection();
  range.anchor.set(...start);
  range.focus.set(...end);
  if (range.isCollapsed() || range.isBackward()) {
    return null;
  }
  return withoutWhitespace(range.getTextContent()) ===
    withoutWhitespace(offer.markdown)
    ? range
    : null;
}

function $convertOffer(
  editor: LexicalEditor,
  offer: MarkdownPasteOffer,
  output: MarkdownPasteOutput,
): boolean {
  const range = $getOfferRange(offer);
  if (range === null) {
    return false;
  }
  const transformers = output.transformers
    .peek()
    .filter(
      transformer =>
        !('dependencies' in transformer) ||
        editor.hasNodes(transformer.dependencies),
    );
  const nodes = $generateNodesFromMarkdownString(
    offer.markdown,
    transformers,
    output.shouldPreserveNewLines.peek(),
    output.shouldMergeAdjacentLines.peek(),
  );
  // HTML with a <pre> in it is pasted as a code block. Inserting into it
  // would turn the Markdown back into code text, so the Markdown takes the
  // code block's place instead: the whole block when it holds the whole
  // paste, or what is left of it once the pasted range is removed.
  const endCode = $getOutermostCodeNode(range.focus.getNode());
  if (
    endCode !== null &&
    withoutWhitespace(endCode.getTextContent()) ===
      withoutWhitespace(offer.markdown)
  ) {
    $replaceWithParagraph(endCode, 'replace');
  } else {
    $setSelection(range);
    range.removeText();
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return false;
    }
    const code = $getOutermostCodeNode(selection.anchor.getNode());
    if (code !== null) {
      $replaceWithParagraph(
        code,
        code.getTextContentSize() === 0
          ? 'replace'
          : selection.anchor.offset === 0
            ? 'before'
            : 'after',
      );
    }
  }
  const selection = $getSelection();
  if (selection === null) {
    return false;
  }
  $insertGeneratedNodes(editor, nodes, selection);
  return true;
}

function registerMarkdownPaste(
  editor: LexicalEditor,
  output: MarkdownPasteOutput,
): () => void {
  const {disabled, isMarkdown, offer} = output;
  // Recorded when a paste starts, and turned into an offer once the update
  // that inserts it has been committed.
  let pending: {markdown: string; start: MarkdownPastePoint} | null = null;
  const dismiss = () => {
    if (offer.peek() === null) {
      return false;
    }
    offer.value = null;
    return true;
  };
  return mergeRegister(
    editor.registerCommand(
      PASTE_COMMAND,
      event => {
        pending = null;
        offer.value = null;
        const clipboardData =
          'clipboardData' in event ? event.clipboardData : null;
        const markdown = clipboardData
          ? clipboardData.getData('text/plain')
          : '';
        const selection = $getSelection();
        if (
          disabled.peek() ||
          !markdown ||
          !$isRangeSelection(selection) ||
          // Markdown means nothing inside a code block.
          $findMatchingParent(selection.anchor.getNode(), $isCodeNode) ||
          !isMarkdown.peek()(markdown)
        ) {
          return false;
        }
        const start = $pointBeforeInsertion(
          selection.isBackward() ? selection.focus : selection.anchor,
        );
        if (start !== null) {
          pending = {markdown, start};
        }
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerUpdateListener(
      ({dirtyElements, dirtyLeaves, editorState, prevEditorState, tags}) => {
        if (pending !== null && tags.has(PASTE_TAG)) {
          const {markdown, start} = pending;
          pending = null;
          offer.value = editorState.read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
              return null;
            }
            const {key, offset, type} = selection.anchor;
            const candidate: MarkdownPasteOffer = {
              end: {key, offset, type},
              markdown,
              start,
            };
            return $getOfferRange(candidate) ? candidate : null;
          });
          return;
        }
        if (offer.peek() === null) {
          return;
        }
        const selection = editorState._selection;
        const prevSelection = prevEditorState._selection;
        if (
          dirtyElements.size > 0 ||
          dirtyLeaves.size > 0 ||
          selection === null ||
          prevSelection === null ||
          !selection.is(prevSelection)
        ) {
          offer.value = null;
        }
      },
    ),
    editor.registerCommand(
      CONVERT_PASTED_MARKDOWN_COMMAND,
      () => {
        const current = offer.peek();
        if (current === null) {
          return false;
        }
        offer.value = null;
        return $convertOffer(editor, current, output);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      DISMISS_PASTED_MARKDOWN_COMMAND,
      dismiss,
      COMMAND_PRIORITY_EDITOR,
    ),
    // Ahead of rich text's Escape handler, which blurs the editor: the
    // first Escape only dismisses the offer.
    editor.registerCommand(KEY_ESCAPE_COMMAND, dismiss, COMMAND_PRIORITY_LOW),
  );
}

/**
 * Offers to convert pasted text that looks like Markdown into rich text.
 *
 * Pasting is unchanged: the clipboard's Lexical, HTML or plain text content
 * is inserted as usual. When its `text/plain` payload looks like Markdown
 * (see {@link MarkdownPasteConfig.isMarkdown}) and the pasted content still
 * shows the Markdown syntax (it came in as plain text, or as HTML that did
 * not render it, e.g. from a terminal or a code editor), the paste is
 * published as {@link MarkdownPasteOutput.offer}. A UI can then show a
 * prompt that dispatches {@link CONVERT_PASTED_MARKDOWN_COMMAND}, which
 * replaces the pasted content with the imported Markdown as one undoable
 * update, or {@link DISMISS_PASTED_MARKDOWN_COMMAND}. The offer is dropped
 * by the next edit or selection change, or by Escape.
 *
 * @example
 * ```ts
 * import {MarkdownPasteExtension, TRANSFORMERS} from '@lexical/markdown';
 * import {RichTextExtension} from '@lexical/rich-text';
 * import {configExtension, defineExtension} from 'lexical';
 *
 * defineExtension({
 *   dependencies: [
 *     RichTextExtension,
 *     configExtension(MarkdownPasteExtension, {transformers: TRANSFORMERS}),
 *   ],
 *   name: 'app',
 * });
 * ```
 */
export const MarkdownPasteExtension = defineExtension({
  build: (_editor, config): MarkdownPasteOutput => ({
    ...namedSignals(config),
    offer: signal<MarkdownPasteOffer | null>(null),
  }),
  config: safeCast<MarkdownPasteConfig>({
    disabled: false,
    isMarkdown: looksLikeMarkdown,
    shouldMergeAdjacentLines: false,
    shouldPreserveNewLines: false,
    transformers: TRANSFORMERS,
  }),
  name: '@lexical/markdown/MarkdownPaste',
  register: (editor, _config, state) =>
    registerMarkdownPaste(editor, state.getOutput()),
});
