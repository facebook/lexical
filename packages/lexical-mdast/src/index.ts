/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// `@lexical/mdast` is configured exclusively through the Lexical extension
// system. Each feature extension ships the nodes it needs and contributes its
// import/export rules (and micromark/mdast extensions) to the core
// `MdastImportExtension` registry — mirroring how `@lexical/html`'s feature
// extensions contribute to `DOMImportExtension`.
//
// - Add `MdastCommonMarkExtension` (or individual feature extensions) for
//   import, `MdastExportExtension` to serialize back to Markdown (or
//   `MdastExtension`, which bundles both directions), and
//   `MdastShortcutsExtension` for streaming shortcuts.
// - Read the Markdown API from the editor with
//   `$getExtensionOutput(MdastImportExtension)` /
//   `$getExtensionOutput(MdastExportExtension)`, or via the
//   `$convert*` shorthands.

export {RenderContextMarkdownSelection} from './MdastExport';
export type {MdastExportExtensionOutput} from './MdastExportExtension';
export {
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  $convertToMdast,
  MdastExportExtension,
} from './MdastExportExtension';
export {MdastExtension} from './MdastExtension';
export {MdastGfmExtension} from './MdastGfmExtension';
export {
  $exportViaDOM,
  MdastHtmlExtension,
  rawHtmlBlock,
  type RawHtmlBlockPart,
  RenderContextMarkdownExport,
} from './MdastHtmlExtension';
export {ImportContextMarkdown} from './MdastImport';
export type {
  MdastConfig,
  MdastImportExtensionOutput,
  MdastShortcutsConfig,
} from './MdastImportExtension';
export {
  $convertFromMarkdownString,
  $convertFromMdast,
  $generateNodesFromMarkdownString,
  $generateNodesFromMdast,
  MdastAutolinkLiteralExtension,
  MdastBlockquoteExtension,
  MdastCodeExtension,
  MdastCommonMarkExtension,
  MdastHeadingExtension,
  MdastHorizontalRuleExtension,
  MdastImportExtension,
  MdastLinkExtension,
  MdastListExtension,
  MdastRichTextExtension,
  MdastShadowRootQuoteExtension,
  MdastShortcutsExtension,
  MdastStrikethroughExtension,
  MdastTaskListExtension,
} from './MdastImportExtension';
export {MdastTableExtension} from './MdastTableExtension';
export type {
  CompiledMdast,
  MdastExportContext,
  MdastExportHandler,
  MdastExportRule,
  MdastImportContext,
  MdastImportHandler,
  MdastImportRule,
  MdastNode,
  MdastParent,
} from './types';
// Re-exported so consumers writing import/export handlers (whose
// signatures traffic in these mdast content types, e.g.
// {@link RawHtmlBlockPart}) don't need their own dependency on the
// `mdast` type declarations.
export type {
  BlockContent,
  Blockquote,
  FootnoteDefinition,
  FootnoteReference,
  Html,
  Paragraph,
  PhrasingContent,
  RootContent,
} from 'mdast';
