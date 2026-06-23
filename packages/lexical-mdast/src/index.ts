/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastTransformer} from './types';
import type {ElementNode} from 'lexical';
import type {Root} from 'mdast';

import {createMdastExport} from './MdastExport';
import {createMdastImport} from './MdastImport';
import {TRANSFORMERS} from './MdastTransformers';

/**
 * Parses `markdown` with micromark/mdast and replaces the contents of the
 * editor root (or `node`) with the resulting Lexical nodes.
 *
 * @param markdown - the Markdown source to import.
 * @param transformers - the transformer set controlling which constructs are
 *   recognized and how they map to Lexical nodes. Defaults to
 *   {@link TRANSFORMERS} (CommonMark + GFM strikethrough/task-lists/autolinks).
 * @param node - an optional element to import into instead of the root.
 * @param tree - an optional pre-parsed mdast `Root`, bypassing the string parse.
 */
export function $convertFromMarkdownString(
  markdown: string,
  transformers: readonly MdastTransformer[] = TRANSFORMERS,
  node?: ElementNode,
  tree?: Root,
): void {
  createMdastImport(transformers)(markdown, node, tree);
}

/**
 * Serializes the editor root (or `node`) to a Markdown string via mdast.
 */
export function $convertToMarkdownString(
  transformers: readonly MdastTransformer[] = TRANSFORMERS,
  node?: ElementNode,
): string {
  return createMdastExport(transformers)(node);
}

export {compileTransformers} from './compile';
export {createMdastExport} from './MdastExport';
export type {MdastConfig, MdastShortcutsConfig} from './MdastExtension';
export {MdastExtension, MdastShortcutsExtension} from './MdastExtension';
export type {MdastImportOptions} from './MdastImport';
export {createMdastImport} from './MdastImport';
export type {MdastShortcutsOptions} from './MdastShortcuts';
export {registerMarkdownShortcuts} from './MdastShortcuts';
export type {MdastBlockMatch} from './MdastStream';
export {MarkdownStreamScanner} from './MdastStream';
export {TABLE_TRANSFORMER} from './MdastTableTransformer';
export {
  AUTOLINK_TRANSFORMER,
  COMMONMARK_TRANSFORMER,
  phrasingFromFormattedText,
  STRIKETHROUGH_TRANSFORMER,
  TASK_LIST_TRANSFORMER,
  TRANSFORMERS,
} from './MdastTransformers';
export type {
  CompiledMdastTransformers,
  MdastExportContext,
  MdastExportHandler,
  MdastImportContext,
  MdastImportHandler,
  MdastNode,
  MdastParent,
  MdastTransformer,
} from './types';
