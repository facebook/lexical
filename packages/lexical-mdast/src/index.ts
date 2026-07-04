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

export type {MdastExportExtensionOutput} from './MdastExportExtension';
export {
  $convertToMarkdownString,
  MdastExportExtension,
} from './MdastExportExtension';
export {MdastExtension} from './MdastExtension';
export {MdastGfmExtension} from './MdastGfmExtension';
export type {
  MdastConfig,
  MdastImportExtensionOutput,
  MdastShortcutsConfig,
} from './MdastImportExtension';
export {
  $convertFromMarkdownString,
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
  MdastExportContext,
  MdastExportHandler,
  MdastExportRule,
  MdastImportContext,
  MdastImportHandler,
  MdastImportRule,
  MdastNode,
  MdastParent,
} from './types';
