/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $withCompactExport,
  type CompactSerializedEditorState,
  defineExtension,
  type EditorState,
  safeCast,
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
   * is strictly equal to its schema default is omitted, as are the
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
   *
   * Typed as {@link CompactSerializedEditorState} whichever form that is,
   * because the form comes from configuration the call site cannot see — so
   * this is the shape both produce, and the legacy form satisfies it as well.
   * Call `editorState.toJSON(compact)` directly to state the form at the call
   * site and get back the type for it.
   */
  $exportJSON: (
    editorState?: EditorState,
    options?: ExportJSONOptions,
  ) => CompactSerializedEditorState;
  /**
   * Run `fn` with this extension's serialization context installed, so any
   * export it performs — `editorState.toJSON()`, a `@lexical/clipboard`
   * selection export, the nested editors those serialize — uses the
   * configured form.
   */
  $withSerialization: <T>(
    fn: () => T,
    ...reject: T extends PromiseLike<unknown>
      ? [theCallbackMustBeSynchronous: never]
      : []
  ) => T;
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
      // Delegating rather than wrapping `editorState.toJSON()` in a compact
      // scope: the form is an argument there now, so the return type says
      // which shape came back instead of naming the full one either way.
      $exportJSON(
        editorState: EditorState = editor.getEditorState(),
        options: ExportJSONOptions = {},
      ): CompactSerializedEditorState {
        const compact =
          options.compact === undefined ? config.compact : options.compact;
        return editorState.toJSON(compact);
      },
      $withSerialization<T>(
        fn: () => T,
        ..._reject: T extends PromiseLike<unknown>
          ? [theCallbackMustBeSynchronous: never]
          : []
      ): T {
        // The same constraint the signature above states, and the same one
        // $withCompactExport states — but TypeScript cannot see that two
        // conditionals over the same unresolved `T` agree, so the forward is
        // widened here rather than either signature being weakened. `unknown`
        // and not `never`: `never extends PromiseLike<unknown>` is true, so
        // that would select the branch this is trying to avoid.
        return $withCompactExport(config.compact, fn as () => unknown) as T;
      },
    };
  },
  config: safeCast<JSONConfig>({compact: false}),
  name: '@lexical/extension/JSON',
});
