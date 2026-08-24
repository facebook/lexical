/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $withCompactExport,
  defineExtension,
  type EditorState,
  safeCast,
  type SerializedEditorState,
} from 'lexical';

/**
 * Controls how the editor's state serializes to JSON for exports made under
 * its context: whether to write the compact or the legacy form.
 *
 * The context is installed by this extension's output — around
 * {@link JSONExtensionOutput.$exportJSON} calls, or any code wrapped in
 * {@link JSONExtensionOutput.$withSerialization}. Export paths invoked
 * outside of those (a bare `editorState.toJSON()`, the editor's built-in
 * copy handler) run without it.
 *
 * @experimental
 */
export interface JSONConfig {
  /**
   * Export the compact form of the document by default: a property whose value
   * is strictly equal to its `json` schema default is omitted, as are the
   * properties the parser derives rather than reads and the deprecated
   * `version`. Parsing restores each, so the compact and legacy forms describe
   * the same document. Defaults to false (the legacy form).
   */
  compact: boolean;
}

/** Options for a single {@link JSONExtensionOutput.$exportJSON} call. */
export interface ExportJSONOptions {
  /** Override the extension's configured `compact` for this export. */
  readonly compact?: boolean;
}

export interface JSONExtensionOutput {
  /**
   * Serialize an editor state (the editor's current one by default) in the
   * form this extension is configured for.
   */
  $exportJSON: (
    editorState?: EditorState,
    options?: ExportJSONOptions,
  ) => SerializedEditorState;
  /**
   * Run `fn` with this extension's serialization context installed, so any
   * export it performs — `editorState.toJSON()`, a `@lexical/clipboard`
   * selection export, the nested editors those serialize — uses the
   * configured form.
   */
  $withSerialization: <T>(fn: () => T) => T;
}

/**
 * Serialize this editor's state in the compact or the legacy JSON form.
 *
 * @example
 * ```ts
 * configExtension(JSONExtension, {compact: true})
 * ```
 *
 * @experimental
 */
export const JSONExtension = defineExtension({
  build(editor, config): JSONExtensionOutput {
    return {
      $exportJSON(editorState = editor.getEditorState(), options = {}) {
        const compact =
          options.compact === undefined ? config.compact : options.compact;
        return $withCompactExport(compact, () => editorState.toJSON());
      },
      $withSerialization<T>(fn: () => T): T {
        return $withCompactExport(config.compact, fn);
      },
    };
  },
  config: safeCast<JSONConfig>({compact: false}),
  name: '@lexical/extension/JSON',
});
