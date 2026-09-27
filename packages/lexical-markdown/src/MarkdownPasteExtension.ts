/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertGeneratedNodes,
  ClipboardImportExtension,
  type ImportMimeTypeFunction,
} from '@lexical/clipboard';
import {$isCodeNode} from '@lexical/code-core';
import {
  $getExtensionDependency,
  namedSignals,
  type NamedSignalsOutput,
  type Signal,
  signal,
} from '@lexical/extension';
import {
  $findMatchingParent,
  $getEditor,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  type BaseSelection,
  COMMAND_PRIORITY_CRITICAL,
  configExtension,
  defineExtension,
  DROP_COMMAND,
  IS_APPLE,
  isExactShortcutMatch,
  KEY_DOWN_COMMAND,
  type LexicalNode,
  mergeRegister,
  PASTE_COMMAND,
  safeCast,
} from 'lexical';

import {$generateNodesFromMarkdownString} from './MarkdownImport';
import {type Transformer, TRANSFORMERS} from './MarkdownTransformers';

/**
 * Configuration for {@link MarkdownPasteExtension}.
 */
export interface MarkdownPasteConfig {
  /**
   * When `true`, pasted plain text is inserted literally, as it is without
   * this extension.
   */
  disabled: boolean;
  /**
   * The transformers used to import the pasted Markdown. Transformers whose
   * node dependencies are not registered on the editor are skipped, so the
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
   * Decide whether a paste should be imported as Markdown. Called after the
   * built-in checks pass; return `false` to insert the text literally.
   */
  $shouldImport: (markdown: string, selection: BaseSelection) => boolean;
}

/**
 * Output of {@link MarkdownPasteExtension}.
 */
export interface MarkdownPasteOutput extends NamedSignalsOutput<MarkdownPasteConfig> {
  /**
   * `true` while the paste being handled was requested as plain text with
   * Mod+Shift+V, so it is inserted literally instead of as Markdown.
   */
  pasteAsPlainText: Signal<boolean>;
}

function isPasteAsPlainTextShortcut(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(
    event,
    'v',
    IS_APPLE
      ? {altKey: 'any', metaKey: true, shiftKey: true}
      : {altKey: 'any', ctrlKey: true, shiftKey: true},
  );
}

/**
 * Whether the nodes imported from `markdown` are just its lines as
 * unformatted paragraphs, i.e. the text had no Markdown in it. The default
 * plain-text paste handles that case better: it keeps the format and style
 * at the caret, and every line break of the text.
 */
function $isPlainTextImport(nodes: LexicalNode[], markdown: string): boolean {
  const importedLines: string[] = [];
  for (const node of nodes) {
    if (!$isParagraphNode(node) || node.getType() !== 'paragraph') {
      return false;
    }
    let line = '';
    for (const child of node.getChildren()) {
      if ($isLineBreakNode(child)) {
        line += '\n';
      } else if ($isTabNode(child)) {
        line += '\t';
      } else if (
        $isTextNode(child) &&
        child.getType() === 'text' &&
        child.getFormat() === 0 &&
        child.getStyle() === ''
      ) {
        line += child.getTextContent();
      } else {
        return false;
      }
    }
    importedLines.push(...line.split('\n'));
  }
  const sourceLines = markdown.split(/\r?\n/).map(line => line.trimEnd());
  const nonEmpty = (line: string) => line !== '';
  return (
    importedLines.filter(nonEmpty).join('\n') ===
    sourceLines.filter(nonEmpty).join('\n')
  );
}

const $importMarkdownFromPlainText: ImportMimeTypeFunction = (
  data,
  selection,
  $next,
) => {
  const {output} = $getExtensionDependency(MarkdownPasteExtension);
  if (output.disabled.peek() || output.pasteAsPlainText.peek()) {
    return $next();
  }
  // Markdown means nothing inside a code block: its text is taken literally.
  if (
    $isRangeSelection(selection) &&
    $findMatchingParent(selection.anchor.getNode(), $isCodeNode)
  ) {
    return $next();
  }
  if (!output.$shouldImport.peek()(data, selection)) {
    return $next();
  }
  const editor = $getEditor();
  const transformers = output.transformers
    .peek()
    .filter(
      transformer =>
        !('dependencies' in transformer) ||
        editor.hasNodes(transformer.dependencies),
    );
  const nodes = $generateNodesFromMarkdownString(
    data,
    transformers,
    output.shouldPreserveNewLines.peek(),
    output.shouldMergeAdjacentLines.peek(),
  );
  if (nodes.length === 0 || $isPlainTextImport(nodes, data)) {
    return $next();
  }
  $insertGeneratedNodes(editor, nodes, selection);
  return true;
};

/**
 * Imports pasted or dropped plain text as Markdown, so that text copied
 * from a README, a notes app or an LLM chat keeps its headings, lists,
 * links, code blocks and inline formats. It adds a `text/plain` handler to
 * {@link ClipboardImportExtension}, so it applies to rich text editors, and
 * HTML or Lexical content on the clipboard keeps its priority.
 *
 * Text is inserted literally when it contains no Markdown, when the
 * selection is inside a code block, when {@link MarkdownPasteConfig.$shouldImport}
 * returns `false`, or when it is pasted with Mod+Shift+V (paste as plain
 * text).
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
    pasteAsPlainText: signal(false),
  }),
  config: safeCast<MarkdownPasteConfig>({
    $shouldImport: () => true,
    disabled: false,
    shouldMergeAdjacentLines: false,
    shouldPreserveNewLines: false,
    transformers: TRANSFORMERS,
  }),
  dependencies: [
    configExtension(ClipboardImportExtension, {
      $importMimeType: {'text/plain': [$importMarkdownFromPlainText]},
    }),
  ],
  name: '@lexical/markdown/MarkdownPaste',
  register: (editor, _config, state) => {
    const {pasteAsPlainText} = state.getOutput();
    // The paste event follows the keydown of its shortcut, and the paste
    // itself is imported in a later update, so the shortcut is remembered
    // from the keydown until the next paste event decides it. A drop is
    // never a plain-text paste.
    let shortcutPressed = false;
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        event => {
          shortcutPressed = isPasteAsPlainTextShortcut(event);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        () => {
          pasteAsPlainText.value = shortcutPressed;
          shortcutPressed = false;
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        () => {
          pasteAsPlainText.value = false;
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  },
});
