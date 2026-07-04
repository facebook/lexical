/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode} from 'lexical';

import {$getExtensionOutput} from '@lexical/extension';
import {defineExtension} from 'lexical';

import {createMdastExport} from './MdastExport';
import {MdastImportExtension} from './MdastImportExtension';

/**
 * The runtime API exposed by {@link MdastExportExtension}. Obtain it inside a
 * read/update with `$getExtensionOutput(MdastExportExtension)`, or use the
 * {@link $convertToMarkdownString} shorthand.
 */
export interface MdastExportExtensionOutput {
  /**
   * Serializes the editor root (or `node`) to a Markdown string. Must be
   * called inside an `editor.read()` or `editor.update()`.
   */
  $convertToMarkdownString(node?: ElementNode): string;
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
 */
export const MdastExportExtension = /* @__PURE__ */ defineExtension<
  Record<never, never>,
  '@lexical/mdast/Export',
  MdastExportExtensionOutput,
  void
>({
  build(editor, config, state): MdastExportExtensionOutput {
    const {registry} = state.getDependency(MdastImportExtension).output;
    const exportMarkdown = createMdastExport(registry);
    return {
      $convertToMarkdownString: node => exportMarkdown(node),
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
 */
export function $convertToMarkdownString(node?: ElementNode): string {
  return $getExtensionOutput(MdastExportExtension).$convertToMarkdownString(
    node,
  );
}
