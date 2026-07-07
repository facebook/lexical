/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode} from 'lexical';
import type {Root} from 'mdast';

import {$getExtensionOutput} from '@lexical/extension';
import {defineExtension} from 'lexical';

import {createMdastExport} from './MdastExport';
import {MdastImportExtension} from './MdastImportExtension';

/**
 * The runtime API exposed by {@link MdastExportExtension}. Obtain it inside a
 * read/update with `$getExtensionOutput(MdastExportExtension)`, or use the
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
}

/**
 * Markdown serialization for `@lexical/mdast`. Import
 * (`MdastImportExtension` and the feature extensions that contribute to it) and
 * export are separate extensions so that editors which only *parse* Markdown
 * — never serialize back — don't bundle `mdast-util-to-markdown`.
 *
 * The export rules themselves are contributed by the same feature extensions
 * that contribute import rules; this extension compiles the shared registry
 * into a serializer:
 * ```ts
 * dependencies: [MdastCommonMarkExtension, MdastExportExtension]
 * ```
 * @experimental
 */
export const MdastExportExtension = /* @__PURE__ */ defineExtension<
  Record<never, never>,
  '@lexical/mdast/Export',
  MdastExportExtensionOutput,
  void
>({
  build(editor, config, state): MdastExportExtensionOutput {
    const {registry} = state.getDependency(MdastImportExtension).output;
    const {$exportToMdast, $exportToMarkdown} = createMdastExport(registry);
    return {
      $convertToMarkdownString: node => $exportToMarkdown(node),
      $convertToMdast: node => $exportToMdast(node),
    };
  },
  dependencies: [MdastImportExtension],
  name: '@lexical/mdast/Export',
});

/**
 * Shorthand for
 * `$getExtensionOutput(MdastExportExtension).$convertToMarkdownString`.
 * Must be called inside an `editor.read()` or `editor.update()`. Throws if
 * the editor was not built with {@link MdastExportExtension}.
 * @experimental
 */
export function $convertToMarkdownString(node?: ElementNode): string {
  return $getExtensionOutput(MdastExportExtension).$convertToMarkdownString(
    node,
  );
}

/**
 * Shorthand for `$getExtensionOutput(MdastExportExtension).$convertToMdast`.
 * Must be called inside an `editor.read()` or `editor.update()`. Throws if
 * the editor was not built with {@link MdastExportExtension}.
 * @experimental
 */
export function $convertToMdast(node?: ElementNode): Root {
  return $getExtensionOutput(MdastExportExtension).$convertToMdast(node);
}
