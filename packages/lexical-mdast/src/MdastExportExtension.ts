/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {BaseSelection, ElementNode} from 'lexical';
import type {Root} from 'mdast';

import {$getExtensionOutput} from '@lexical/extension';
import {defineExtension} from 'lexical';

import {MdastExtension} from './MdastExtension';

/**
 * The runtime API exposed by {@link MdastExportExtension}. Obtain it inside a
 * read/update with `$getExtensionOutput(MdastExtension)`, or use the
 * {@link $convertToMarkdownString} shorthand.
 * @experimental
 */
export interface MdastExportExtensionOutput {
  /**
   * Serializes the editor root (or `node`) to a Markdown string. Must be
   * called inside an `editor.read()` or `editor.update()`.
   */
  $convertToMarkdownString(node?: ElementNode): string;
  /**
   * Exports the editor root (or `node`) to an mdast `Root` tree without
   * serializing it, for interop with the unified/remark ecosystem (remark
   * plugins, `remark-rehype`, tree diffing, ...). Must be called inside an
   * `editor.read()` or `editor.update()`. Syntax preserved from import
   * rides along as `data` fields on the nodes, mdast's sanctioned
   * extension point.
   */
  $convertToMdast(node?: ElementNode): Root;
  /**
   * Serializes only the selected content (defaulting to the current
   * selection) to a Markdown string: leaves outside the selection are
   * skipped, partially selected text nodes are sliced to the selected
   * range, and elements are kept when they or any descendant are selected.
   * Returns `''` for a null or collapsed selection. Must be called inside
   * an `editor.read()` or `editor.update()`. The export runs under
   * {@link RenderContextMarkdownSelection} carrying the selection, so
   * contributed export rules and to-markdown handlers can scope their
   * output to a selection export.
   */
  $convertSelectionToMarkdownString(selection?: BaseSelection | null): string;
}

/**
 * Exposes the export API of {@link MdastExtension}.
 * @experimental
 */
export const MdastExportExtension = defineExtension<
  Record<never, never>,
  '@lexical/mdast/Export',
  MdastExportExtensionOutput,
  void
>({
  build(editor, config, state): MdastExportExtensionOutput {
    return state.getDependency(MdastExtension).output;
  },
  dependencies: [MdastExtension],
  name: '@lexical/mdast/Export',
});

/**
 * Shorthand for
 * `$getExtensionOutput(MdastExtension).$convertToMarkdownString`.
 * Must be called inside an `editor.read()` or `editor.update()`. Throws if
 * the editor was not built with {@link MdastExtension}.
 * @experimental
 */
export function $convertToMarkdownString(node?: ElementNode): string {
  return $getExtensionOutput(MdastExtension).$convertToMarkdownString(node);
}

/**
 * Shorthand for `$getExtensionOutput(MdastExtension).$convertToMdast`.
 * Must be called inside an `editor.read()` or `editor.update()`. Throws if
 * the editor was not built with {@link MdastExtension}.
 * @experimental
 */
export function $convertToMdast(node?: ElementNode): Root {
  return $getExtensionOutput(MdastExtension).$convertToMdast(node);
}

/**
 * Shorthand for
 * `$getExtensionOutput(MdastExtension).$convertSelectionToMarkdownString`.
 * Serializes only the selected content (defaulting to the current selection)
 * to a Markdown string; returns `''` for a null or collapsed selection.
 * Must be called inside an `editor.read()` or `editor.update()`. Throws if
 * the editor was not built with {@link MdastExtension}.
 * @experimental
 */
export function $convertSelectionToMarkdownString(
  selection?: BaseSelection | null,
): string {
  return $getExtensionOutput(MdastExtension).$convertSelectionToMarkdownString(
    selection,
  );
}
