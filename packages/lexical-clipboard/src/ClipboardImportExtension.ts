/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode} from 'lexical';

import {getPeerDependencyFromEditor} from '@lexical/extension';
import {$generateNodesFromDOM} from '@lexical/html';
import {defineExtension, safeCast, shallowMergeConfig} from 'lexical';

/**
 * The function used to convert pasted HTML into lexical nodes during a
 * clipboard import. Receives the editor and the parsed {@link Document}
 * and returns the imported nodes. Must be callable inside an
 * `editor.update()` context.
 *
 * @experimental
 */
export type ClipboardImporter = (
  editor: LexicalEditor,
  dom: Document,
) => LexicalNode[];

/**
 * Configuration for {@link ClipboardImportExtension}.
 *
 * @experimental
 */
export interface ClipboardImportConfig {
  /**
   * Override the function used to convert pasted HTML into lexical nodes.
   * Defaults to the legacy `$generateNodesFromDOM` from `@lexical/html`.
   * Combine with the helper exported from `@lexical/html` to route
   * clipboard pastes through {@link DOMImportExtension}.
   */
  $generateNodesFromDOM: ClipboardImporter;
}

/**
 * @experimental
 *
 * Extension that lets editors choose how pasted HTML is converted into
 * lexical nodes. Defaults to the legacy `$generateNodesFromDOM`, so
 * adding it with no overrides changes nothing.
 *
 * @example
 * Opt the clipboard into {@link DOMImportExtension}:
 * ```ts
 * import {configExtension, defineExtension} from 'lexical';
 * import {ClipboardImportExtension} from '@lexical/clipboard';
 * import {
 *   contextValue,
 *   DOMImportExtension,
 *   ImportSource,
 *   getExtensionDependencyFromEditor,
 * } from '@lexical/html';
 *
 * defineExtension({
 *   name: 'app',
 *   dependencies: [
 *     DOMImportExtension,
 *     configExtension(ClipboardImportExtension, {
 *       $generateNodesFromDOM: (editor, dom) => {
 *         const dep = getExtensionDependencyFromEditor(
 *           editor,
 *           DOMImportExtension,
 *         );
 *         return dep.output.$generateNodesFromDOM(dom, {
 *           context: [contextValue(ImportSource, 'paste')],
 *         });
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export const ClipboardImportExtension = defineExtension({
  build(_editor, config) {
    return config;
  },
  config: safeCast<ClipboardImportConfig>({
    $generateNodesFromDOM,
  }),
  mergeConfig(config, partial) {
    return shallowMergeConfig(config, partial);
  },
  name: '@lexical/clipboard/Import',
});

/**
 * Look up the {@link ClipboardImporter} configured on the editor (via a
 * registered {@link ClipboardImportExtension}). Returns the legacy
 * {@link $generateNodesFromDOM} when no extension is configured, so the
 * existing behavior is preserved end-to-end without code changes at
 * call-sites.
 *
 * @internal
 */
export function getClipboardImporter(editor: LexicalEditor): ClipboardImporter {
  const dep = getPeerDependencyFromEditor<typeof ClipboardImportExtension>(
    editor,
    ClipboardImportExtension.name,
  );
  return dep ? dep.output.$generateNodesFromDOM : $generateNodesFromDOM;
}
