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
// `MdastExtension` registry — mirroring how `@lexical/html`'s feature
// extensions contribute to `DOMImportExtension`.
//
// - Add `MdastCommonMarkExtension` (or individual feature extensions) for
//   import/export, and `MdastShortcutsExtension` for streaming shortcuts.
// - Read the Markdown API from the editor with
//   `$getExtensionOutput(MdastExtension)`, or via the
//   `$convert*ViaExtension` shorthands.

export type {
  MdastConfig,
  MdastExtensionOutput,
  MdastShortcutsConfig,
} from './MdastExtension';
export {
  $convertFromMarkdownStringViaExtension,
  $convertToMarkdownStringViaExtension,
  MdastCodeExtension,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastLinkExtension,
  MdastListExtension,
  MdastRichTextExtension,
  MdastShortcutsExtension,
  MdastStrikethroughExtension,
} from './MdastExtension';
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
