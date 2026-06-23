/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CompiledMdast,
  FromMarkdownExtension,
  MdastExportRule,
  MdastImportRule,
  MicromarkExtension,
  ToMarkdownExtension,
} from './types';
import type {ElementNode} from 'lexical';
import type {Root} from 'mdast';

import {CodeNode} from '@lexical/code-core';
import {
  $getExtensionOutput,
  effect,
  getExtensionDependencyFromEditor,
  namedSignals,
} from '@lexical/extension';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  configExtension,
  defineExtension,
  safeCast,
  shallowMergeConfig,
} from 'lexical';
import {
  gfmAutolinkLiteralFromMarkdown,
  gfmAutolinkLiteralToMarkdown,
} from 'mdast-util-gfm-autolink-literal';
import {
  gfmStrikethroughFromMarkdown,
  gfmStrikethroughToMarkdown,
} from 'mdast-util-gfm-strikethrough';
import {
  gfmTaskListItemFromMarkdown,
  gfmTaskListItemToMarkdown,
} from 'mdast-util-gfm-task-list-item';
import {gfmAutolinkLiteral} from 'micromark-extension-gfm-autolink-literal';
import {gfmStrikethrough} from 'micromark-extension-gfm-strikethrough';
import {gfmTaskListItem} from 'micromark-extension-gfm-task-list-item';

import {compileMdast} from './compile';
import {
  $exportCode,
  $exportHeading,
  $exportLineBreak,
  $exportList,
  $importBlockquote,
  $importBreak,
  $importCode,
  $importEmphasis,
  $importHeading,
  $importLink,
  $importList,
  $importListItem,
  $importParagraph,
  $importStrong,
  exportLink,
  exportParagraph,
  exportQuote,
  exportTab,
  exportText,
  importDelete,
  importHtml,
  importInlineCode,
  importText,
} from './handlers';
import {createMdastExport} from './MdastExport';
import {createMdastImport} from './MdastImport';
import {registerMarkdownShortcuts} from './MdastShortcuts';

/**
 * Configuration for the core {@link MdastExtension} registry. Feature
 * extensions contribute to these arrays via `configExtension(MdastExtension,
 * …)`; you rarely need to set them by hand. The shape mirrors
 * `@lexical/html`'s `DOMImportExtension` config: raw contribution arrays that
 * `mergeConfig` concatenates and `build` compiles.
 */
export interface MdastConfig {
  /** mdast `type` -> Lexical mapping rules used while importing. */
  readonly importRules: readonly MdastImportRule[];
  /** Lexical `getType()` -> mdast mapping rules used while exporting. */
  readonly exportRules: readonly MdastExportRule[];
  /** micromark syntax extensions (the tokenizer layer). */
  readonly micromarkExtensions: readonly MicromarkExtension[];
  /** `mdast-util-from-markdown` extensions (tokens -> mdast). */
  readonly mdastExtensions: readonly FromMarkdownExtension[];
  /** `mdast-util-to-markdown` extensions (mdast -> Markdown string). */
  readonly toMarkdownExtensions: readonly ToMarkdownExtension[];
}

/**
 * The runtime API exposed by {@link MdastExtension}. Obtain it inside a
 * read/update with `$getExtensionOutput(MdastExtension)`, or use the
 * {@link $convertFromMarkdownString} /
 * {@link $convertToMarkdownString} shorthands.
 */
export interface MdastExtensionOutput {
  /**
   * Parses `markdown` with micromark/mdast and replaces the contents of the
   * editor root (or `node`). Must be called inside an `editor.update()`.
   */
  $convertFromMarkdownString(
    markdown: string,
    node?: ElementNode,
    tree?: Root,
  ): void;
  /**
   * Serializes the editor root (or `node`) to a Markdown string. Must be
   * called inside an `editor.read()` or `editor.update()`.
   */
  $convertToMarkdownString(node?: ElementNode): string;
  /**
   * The compiled registry assembled from every contributing extension.
   *
   * @internal consumed by {@link MdastShortcutsExtension}.
   */
  readonly registry: CompiledMdast;
}

// The baseline rules that need no node packages: paragraphs and inline text
// formatting (CommonMark handles these without any micromark extension).
const CORE_IMPORT_RULES: readonly MdastImportRule[] = [
  {$import: $importParagraph, type: 'paragraph'},
  {$import: importText, type: 'text'},
  {$import: importHtml, type: 'html'},
  {$import: importInlineCode, type: 'inlineCode'},
  {$import: $importEmphasis, type: 'emphasis'},
  {$import: $importStrong, type: 'strong'},
  {$import: $importBreak, type: 'break'},
];
const CORE_EXPORT_RULES: readonly MdastExportRule[] = [
  {$export: exportParagraph, type: 'paragraph'},
  {$export: exportText, type: 'text'},
  {$export: $exportLineBreak, type: 'linebreak'},
  {$export: exportTab, type: 'tab'},
];

/**
 * The core Markdown registry for `@lexical/mdast`, modelled on
 * `@lexical/html`'s `DOMImportExtension`. It assembles the import/export rules
 * and micromark/mdast extensions contributed by feature extensions into a
 * compiled registry, and exposes Markdown import/export through its
 * {@link MdastExtensionOutput}.
 *
 * You normally do not depend on this directly — depend on a feature extension
 * (e.g. {@link MdastCommonMarkExtension}) which contributes its rules here and
 * ships the nodes those rules need.
 *
 * @example
 * ```ts
 * import {$convertFromMarkdownString, MdastCommonMarkExtension}
 *   from '@lexical/mdast';
 * import {buildEditorFromExtensions} from '@lexical/extension';
 * import {defineExtension} from 'lexical';
 *
 * const editor = buildEditorFromExtensions(
 *   defineExtension({dependencies: [MdastCommonMarkExtension], name: '[root]'}),
 * );
 * editor.update(() => $convertFromMarkdownString('# Hi'));
 * ```
 */
export const MdastExtension = /* @__PURE__ */ defineExtension<
  MdastConfig,
  '@lexical/mdast/Mdast',
  MdastExtensionOutput,
  void
>({
  build(editor, config): MdastExtensionOutput {
    const registry = compileMdast(config);
    const importMarkdown = createMdastImport(registry);
    const exportMarkdown = createMdastExport(registry);
    return {
      $convertFromMarkdownString: (markdown, node, tree) =>
        importMarkdown(markdown, node, tree),
      $convertToMarkdownString: node => exportMarkdown(node),
      registry,
    };
  },
  config: /* @__PURE__ */ safeCast<MdastConfig>({
    exportRules: CORE_EXPORT_RULES,
    importRules: CORE_IMPORT_RULES,
    mdastExtensions: [],
    micromarkExtensions: [],
    toMarkdownExtensions: [],
  }),
  mergeConfig(config, partial) {
    // Prepend contributed rules so extensions merged later (closer to the
    // editor root) take priority, matching DOMImportExtension's convention.
    return shallowMergeConfig(config, {
      ...partial,
      ...(partial.importRules && {
        importRules: [...partial.importRules, ...config.importRules],
      }),
      ...(partial.exportRules && {
        exportRules: [...partial.exportRules, ...config.exportRules],
      }),
      ...(partial.micromarkExtensions && {
        micromarkExtensions: [
          ...partial.micromarkExtensions,
          ...config.micromarkExtensions,
        ],
      }),
      ...(partial.mdastExtensions && {
        mdastExtensions: [
          ...partial.mdastExtensions,
          ...config.mdastExtensions,
        ],
      }),
      ...(partial.toMarkdownExtensions && {
        toMarkdownExtensions: [
          ...partial.toMarkdownExtensions,
          ...config.toMarkdownExtensions,
        ],
      }),
    });
  },
  name: '@lexical/mdast/Mdast',
});

/**
 * Headings and block quotes, shipping {@link HeadingNode} and
 * {@link QuoteNode}.
 */
export const MdastRichTextExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      exportRules: [
        {$export: $exportHeading, type: 'heading'},
        {$export: exportQuote, type: 'quote'},
      ],
      importRules: [
        {$import: $importHeading, type: 'heading'},
        {$import: $importBlockquote, type: 'blockquote'},
      ],
    }),
  ],
  name: '@lexical/mdast/RichText',
  nodes: [HeadingNode, QuoteNode],
});

/**
 * Ordered, unordered, and GFM task lists, shipping {@link ListNode} and
 * {@link ListItemNode}.
 */
export const MdastListExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      exportRules: [{$export: $exportList, type: 'list'}],
      importRules: [
        {$import: $importList, type: 'list'},
        {$import: $importListItem, type: 'listItem'},
      ],
      mdastExtensions: [gfmTaskListItemFromMarkdown()],
      micromarkExtensions: [gfmTaskListItem()],
      toMarkdownExtensions: [gfmTaskListItemToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/List',
  nodes: [ListNode, ListItemNode],
});

/**
 * Fenced and indented code blocks, shipping {@link CodeNode}.
 */
export const MdastCodeExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      exportRules: [{$export: $exportCode, type: 'code'}],
      importRules: [{$import: $importCode, type: 'code'}],
    }),
  ],
  name: '@lexical/mdast/Code',
  nodes: [CodeNode],
});

/**
 * Inline links plus GFM literal autolinks, shipping {@link LinkNode}.
 */
export const MdastLinkExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      exportRules: [{$export: exportLink, type: 'link'}],
      importRules: [{$import: $importLink, type: 'link'}],
      mdastExtensions: [gfmAutolinkLiteralFromMarkdown()],
      micromarkExtensions: [gfmAutolinkLiteral()],
      toMarkdownExtensions: [gfmAutolinkLiteralToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Link',
  nodes: [LinkNode],
});

/**
 * GFM `~~strikethrough~~`, mapped to the Lexical `strikethrough` text format.
 * Needs no extra nodes (the core text handlers carry the format bit).
 */
export const MdastStrikethroughExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      importRules: [{$import: importDelete, type: 'delete'}],
      mdastExtensions: [gfmStrikethroughFromMarkdown()],
      micromarkExtensions: [gfmStrikethrough()],
      toMarkdownExtensions: [gfmStrikethroughToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Strikethrough',
});

/**
 * The recommended setup: CommonMark (headings, quotes, lists, code, links)
 * plus the lightweight GFM features (strikethrough, task lists, autolinks)
 * that map onto existing Lexical nodes. Add `MdastTableExtension` (from the
 * same package) for GFM tables.
 */
export const MdastCommonMarkExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    MdastRichTextExtension,
    MdastListExtension,
    MdastCodeExtension,
    MdastLinkExtension,
    MdastStrikethroughExtension,
  ],
  name: '@lexical/mdast/CommonMark',
});

export interface MdastShortcutsConfig {
  /** Disable the streaming shortcuts without removing the extension. */
  disabled: boolean;
}

/**
 * Streaming Markdown shortcuts (block markers convert on space, fenced code on
 * Enter, inline constructs on their closing delimiter) layered on top of
 * {@link MdastCommonMarkExtension}. Each keystroke is fed back through
 * micromark, so shortcut recognition uses the same grammar and the same
 * enabled extensions as import — including any extra feature extensions you add
 * to the editor.
 */
export const MdastShortcutsExtension = /* @__PURE__ */ defineExtension({
  build: (editor, config) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<MdastShortcutsConfig>({disabled: false}),
  dependencies: [MdastCommonMarkExtension],
  name: '@lexical/mdast/Shortcuts',
  register: (editor, config, state) => {
    const {disabled} = state.getOutput();
    return effect(() => {
      if (disabled.value) {
        return undefined;
      }
      const {registry} = getExtensionDependencyFromEditor(
        editor,
        MdastExtension,
      ).output;
      return registerMarkdownShortcuts(editor, registry);
    });
  },
});

/**
 * Shorthand for `$getExtensionOutput(MdastExtension).$convertFromMarkdownString`.
 * Must be called inside an `editor.update()`. Throws if the editor was not
 * built with {@link MdastExtension} (or an extension that depends on it).
 */
export function $convertFromMarkdownString(
  markdown: string,
  node?: ElementNode,
  tree?: Root,
): void {
  $getExtensionOutput(MdastExtension).$convertFromMarkdownString(
    markdown,
    node,
    tree,
  );
}

/**
 * Shorthand for `$getExtensionOutput(MdastExtension).$convertToMarkdownString`.
 * Must be called inside an `editor.read()` or `editor.update()`.
 */
export function $convertToMarkdownString(node?: ElementNode): string {
  return $getExtensionOutput(MdastExtension).$convertToMarkdownString(node);
}
