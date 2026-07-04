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
  MdastExportHandler,
  MdastExportRule,
  MdastImportHandler,
  MdastImportRule,
  MicromarkExtension,
  ToMarkdownExtension,
} from './types';
import type {ElementNode} from 'lexical';
import type {Root, ThematicBreak} from 'mdast';

import {CodeNode} from '@lexical/code-core';
import {
  $createHorizontalRuleNode,
  $getExtensionOutput,
  $isHorizontalRuleNode,
  effect,
  getExtensionDependencyFromEditor,
  HorizontalRuleExtension,
  namedSignals,
} from '@lexical/extension';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $getState,
  $setState,
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
  $importLinkReference,
  $importList,
  $importListItem,
  $importParagraph,
  $importShadowRootBlockquote,
  $importStrong,
  exportLink,
  exportParagraph,
  exportQuote,
  exportTab,
  exportText,
  importDefinition,
  importDelete,
  importHtml,
  importInlineCode,
  importText,
} from './handlers';
import {createMdastExport} from './MdastExport';
import {createMdastImport} from './MdastImport';
import {registerMarkdownShortcuts} from './MdastShortcuts';
import {hrMarkerState} from './state';

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
  /**
   * mdast inline `type`s that the streaming shortcuts may materialize when
   * their closing delimiter is typed. Extensions that contribute a new inline
   * construct add its type here (with a matching import rule) so shortcuts
   * stay in lock-step with the parser.
   */
  readonly inlineShortcutTypes: readonly string[];
  /**
   * Characters that can close an inline construct; typing one triggers an
   * inline re-scan. Extensions add their construct's closing character here
   * (e.g. `'='` for `==highlight==`).
   */
  readonly inlineShortcutTriggers: readonly string[];
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
    inlineShortcutTriggers: ['*', '_', '`', '~', ')'],
    inlineShortcutTypes: ['delete', 'emphasis', 'inlineCode', 'link', 'strong'],
    mdastExtensions: [],
    micromarkExtensions: [],
    toMarkdownExtensions: [],
  }),
  mergeConfig(config, partial) {
    // Prepend contributed rules so extensions merged later (closer to the
    // editor root) take priority, matching DOMImportExtension's convention.
    // Every key is set explicitly so an explicitly-undefined key in `partial`
    // (allowed by Partial<MdastConfig>) can never clobber the merged arrays.
    function mergeArray<T>(
      contributed: readonly T[] | undefined,
      existing: readonly T[],
    ): readonly T[] {
      return contributed ? [...contributed, ...existing] : existing;
    }
    return shallowMergeConfig(config, {
      exportRules: mergeArray(partial.exportRules, config.exportRules),
      importRules: mergeArray(partial.importRules, config.importRules),
      inlineShortcutTriggers: mergeArray(
        partial.inlineShortcutTriggers,
        config.inlineShortcutTriggers,
      ),
      inlineShortcutTypes: mergeArray(
        partial.inlineShortcutTypes,
        config.inlineShortcutTypes,
      ),
      mdastExtensions: mergeArray(
        partial.mdastExtensions,
        config.mdastExtensions,
      ),
      micromarkExtensions: mergeArray(
        partial.micromarkExtensions,
        config.micromarkExtensions,
      ),
      toMarkdownExtensions: mergeArray(
        partial.toMarkdownExtensions,
        config.toMarkdownExtensions,
      ),
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
      mdastExtensions: [/* @__PURE__ */ gfmTaskListItemFromMarkdown()],
      micromarkExtensions: [/* @__PURE__ */ gfmTaskListItem()],
      toMarkdownExtensions: [/* @__PURE__ */ gfmTaskListItemToMarkdown()],
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
 * Inline links, CommonMark reference links (`[text][id]` resolved against
 * `[id]: url` definitions), and GFM literal autolinks, shipping
 * {@link LinkNode}. Reference links are resolved to their target on import
 * and serialize back as inline links.
 */
export const MdastLinkExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      exportRules: [{$export: exportLink, type: 'link'}],
      importRules: [
        {$import: $importLink, type: 'link'},
        {$import: $importLinkReference, type: 'linkReference'},
        {$import: importDefinition, type: 'definition'},
      ],
      mdastExtensions: [/* @__PURE__ */ gfmAutolinkLiteralFromMarkdown()],
      micromarkExtensions: [/* @__PURE__ */ gfmAutolinkLiteral()],
      toMarkdownExtensions: [/* @__PURE__ */ gfmAutolinkLiteralToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Link',
  nodes: [LinkNode],
});

/**
 * Opt-in: import Markdown blockquotes as *shadow root* {@link QuoteNode}s
 * (`$createQuoteNode({shadowRoot: true})`), which hold block-level children
 * like a table cell. Structured blockquotes — multiple paragraphs, nested
 * lists, code blocks, nested quotes — then round-trip with full fidelity
 * instead of being reassembled from inline content.
 *
 * Not part of {@link MdastCommonMarkExtension}; add it alongside to opt in:
 * ```ts
 * dependencies: [MdastCommonMarkExtension, MdastShadowRootQuoteExtension]
 * ```
 * The quote *export* handler supports both forms per node, so legacy quotes
 * (e.g. created by the `> ` shortcut) and shadow root quotes can coexist.
 */
export const MdastShadowRootQuoteExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    MdastRichTextExtension,
    // Declared after (and depending on) MdastRichTextExtension so this
    // blockquote rule merges later and takes priority over the default.
    /* @__PURE__ */ configExtension(MdastExtension, {
      importRules: [{$import: $importShadowRootBlockquote, type: 'blockquote'}],
    }),
  ],
  name: '@lexical/mdast/ShadowRootQuote',
});

const $importThematicBreak: MdastImportHandler<ThematicBreak> = (node, ctx) => {
  const hr = $createHorizontalRuleNode();
  // Preserve the marker character (`---` vs `***` vs `___`).
  if (ctx.source && node.position && node.position.start.offset != null) {
    const marker = ctx.source
      .slice(node.position.start.offset, node.position.start.offset + 4)
      .trimStart()[0];
    if (marker === '-' || marker === '*' || marker === '_') {
      $setState(hr, hrMarkerState, marker);
    }
  }
  return hr;
};

const $exportThematicBreak: MdastExportHandler = node => {
  if (!$isHorizontalRuleNode(node)) {
    return null;
  }
  const rule: ThematicBreak = {type: 'thematicBreak'};
  const marker = $getState(node, hrMarkerState);
  if (marker) {
    (rule as ThematicBreak & {data?: {mdastRule?: string}}).data = {
      mdastRule: marker,
    };
  }
  return rule;
};

/**
 * Thematic breaks (`---`, `***`, `___`), mapped to
 * {@link HorizontalRuleExtension}'s `HorizontalRuleNode`. The original marker
 * character is preserved on round-trip.
 */
export const MdastHorizontalRuleExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    HorizontalRuleExtension,
    /* @__PURE__ */ configExtension(MdastExtension, {
      exportRules: [{$export: $exportThematicBreak, type: 'horizontalrule'}],
      importRules: [{$import: $importThematicBreak, type: 'thematicBreak'}],
    }),
  ],
  name: '@lexical/mdast/HorizontalRule',
});

/**
 * GFM `~~strikethrough~~`, mapped to the Lexical `strikethrough` text format.
 * Needs no extra nodes (the core text handlers carry the format bit).
 */
export const MdastStrikethroughExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(MdastExtension, {
      importRules: [{$import: importDelete, type: 'delete'}],
      mdastExtensions: [/* @__PURE__ */ gfmStrikethroughFromMarkdown()],
      micromarkExtensions: [/* @__PURE__ */ gfmStrikethrough()],
      toMarkdownExtensions: [/* @__PURE__ */ gfmStrikethroughToMarkdown()],
    }),
  ],
  name: '@lexical/mdast/Strikethrough',
});

/**
 * The recommended setup: CommonMark (headings, quotes, lists, code, links,
 * thematic breaks) plus the lightweight GFM features (strikethrough, task
 * lists, autolinks) that map onto existing Lexical nodes. Add
 * `MdastTableExtension` (from the same package) for GFM tables.
 */
export const MdastCommonMarkExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    MdastRichTextExtension,
    MdastListExtension,
    MdastCodeExtension,
    MdastLinkExtension,
    MdastHorizontalRuleExtension,
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
