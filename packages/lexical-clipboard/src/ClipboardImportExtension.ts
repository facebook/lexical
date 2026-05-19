/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {BaseSelection, LexicalEditor} from 'lexical';

import {getPeerDependencyFromEditor} from '@lexical/extension';
import {$generateNodesFromDOM} from '@lexical/html';
import {
  $createTabNode,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  safeCast,
  shallowMergeConfig,
} from 'lexical';

import {
  $generateNodesFromSerializedNodes,
  $insertGeneratedNodes,
} from './clipboard';

/**
 * A middleware function in a per-MIME-type clipboard-import stack. Mirrors
 * the shape of {@link ExportMimeTypeFunction} on the export side.
 *
 * - `data` is the non-empty string returned by `DataTransfer.getData(mime)`
 *   for this MIME type.
 * - `selection` is the current editor selection at the insertion point.
 * - `editor` is the editor being mutated.
 * - `next` defers to the next-lower handler in the stack (i.e. the handler
 *   that was registered earlier). Returns `true` if that handler claimed
 *   the data; `false` if no handler accepted it.
 *
 * The function should return `true` if it consumed the data (the caller
 * stops trying further handlers for this MIME type and does not move on to
 * the next MIME type). Return `next()` to delegate. Return `false` if the
 * function decided not to handle the data after inspecting it (e.g. the
 * JSON namespace didn't match) so a lower-priority handler — or the next
 * MIME type — gets a chance.
 *
 * @experimental
 */
export type ImportMimeTypeFunction = (
  data: string,
  selection: BaseSelection,
  editor: LexicalEditor,
  next: () => boolean,
) => boolean;

/**
 * A mapping from MIME type to a stack of {@link ImportMimeTypeFunction}.
 *
 * Each entry is an ordered array; the function at the highest index runs
 * first and may call `next()` to fall through to the function below it.
 * The default config provides one handler each for
 * `'application/x-lexical-editor'`, `'text/html'`, and `'text/plain'` that
 * matches the legacy {@link $insertDataTransferForRichText} behavior.
 *
 * When {@link ClipboardImportExtension} merges a partial config, new
 * functions are appended to the existing array for each MIME type, so
 * later-registered handlers run before earlier ones (including the
 * defaults) and may delegate to them via `next()`.
 *
 * @experimental
 */
 
export type ImportMimeTypeConfig = {
  [key: string]: ImportMimeTypeFunction[] | undefined;
};

/**
 * Configuration for {@link ClipboardImportExtension}.
 *
 * @experimental
 */
export interface ClipboardImportConfig {
  /**
   * The per-MIME-type deserializer stacks used by
   * {@link $insertDataTransferForRichText} when handling a paste or drop
   * event.
   *
   * Merged with `[...prev, ...override]` per MIME type, matching the
   * behavior of {@link GetClipboardDataExtension.$exportMimeType}.
   */
  $importMimeType: ImportMimeTypeConfig;
}

/**
 * The MIME types tried by {@link $insertDataTransferForRichText}, in
 * priority order. The first MIME type whose data is present (and whose
 * stack claims it) wins. `'text/plain'` is special-cased to also fall back
 * to `'text/uri-list'` when no `'text/plain'` data is present.
 *
 * @experimental
 */
export const IMPORT_MIME_TYPE_PRIORITY: readonly string[] = [
  'application/x-lexical-editor',
  'text/html',
  'text/plain',
];

function trustHTML(html: string): string | TrustedHTML {
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    const policy = window.trustedTypes.createPolicy('lexical', {
      createHTML: input => input,
    });
    return policy.createHTML(html);
  }
  return html;
}

/**
 * Default handler for `'application/x-lexical-editor'`: parse the JSON,
 * verify the namespace, and insert the serialized nodes.
 */
const $defaultLexicalEditorImporter = (
  data,
  selection,
  editor,
  next,
) => {
  try {
    const payload = JSON.parse(data);
    if (
      payload &&
      payload.namespace === editor._config.namespace &&
      Array.isArray(payload.nodes)
    ) {
      const nodes = $generateNodesFromSerializedNodes(payload.nodes);
      $insertGeneratedNodes(editor, nodes, selection);
      return true;
    }
  } catch (error) {
     
    console.error(error);
  }
  return next();
};

/**
 * Default handler for `'text/html'`: parse the HTML and run the legacy
 * `$generateNodesFromDOM`. Override (or stack a higher-priority handler
 * on top) to route HTML pastes through {@link DOMImportExtension} or any
 * custom pipeline. See {@link $generateNodesFromDOMViaExtension} for the
 * built-in `DOMImportExtension` adapter.
 */
const $defaultHtmlImporter = (
  data,
  selection,
  editor,
  next,
) => {
  try {
    const parser = new DOMParser();
    const dom = parser.parseFromString(trustHTML(data) as string, 'text/html');
    const nodes = $generateNodesFromDOM(editor, dom);
    $insertGeneratedNodes(editor, nodes, selection);
    return true;
  } catch (error) {
     
    console.error(error);
    return next();
  }
};

/**
 * Default handler for `'text/plain'`: split on newlines and tabs and
 * insert paragraphs / line breaks / tab nodes respectively for a
 * RangeSelection; otherwise insert as raw text.
 */
const $defaultPlainTextImporter = (data, selection) => {
  if ($isRangeSelection(selection)) {
    const parts = data.split(/(\r?\n|\t)/);
    if (parts[parts.length - 1] === '') {
      parts.pop();
    }
    for (let i = 0; i < parts.length; i++) {
      const currentSelection = $getSelection();
      if ($isRangeSelection(currentSelection)) {
        const part = parts[i];
        if (part === '\n' || part === '\r\n') {
          currentSelection.insertParagraph();
        } else if (part === '\t') {
          currentSelection.insertNodes([$createTabNode()]);
        } else {
          currentSelection.insertText(part);
        }
      }
    }
  } else {
    selection.insertRawText(data);
  }
  return true;
};

/**
 * The default per-MIME-type handler stacks reproducing the legacy
 * {@link $insertDataTransferForRichText} behavior exactly. Stacked
 * extensions append on top of these.
 *
 * @experimental
 */
export const DEFAULT_IMPORT_MIME_TYPE: ImportMimeTypeConfig = {
  'application/x-lexical-editor': [$defaultLexicalEditorImporter],
  'text/html': [$defaultHtmlImporter],
  'text/plain': [$defaultPlainTextImporter],
};

/**
 * Invoke a stack from the highest-index handler down. Identical in shape
 * to the export-side `callExportMimeTypeFunctionStack`.
 *
 * @internal
 */
export function callImportMimeTypeFunctionStack(
  fns: ImportMimeTypeFunction[] | undefined,
  data: string,
  selection: BaseSelection,
  editor: LexicalEditor,
): boolean {
  if (!fns) {
    return false;
  }
  const callAt = (i: number): boolean =>
    fns[i] ? fns[i](data, selection, editor, callAt.bind(null, i - 1)) : false;
  return callAt(fns.length - 1);
}

/**
 * @experimental
 *
 * Look up the merged {@link ImportMimeTypeConfig} on the editor. Returns
 * {@link DEFAULT_IMPORT_MIME_TYPE} when no {@link ClipboardImportExtension}
 * is configured (so behavior is unchanged for editors that don't opt in).
 *
 * @internal
 */
export function $getImportConfig(editor: LexicalEditor): ImportMimeTypeConfig {
  const dep = getPeerDependencyFromEditor<typeof ClipboardImportExtension>(
    editor,
    ClipboardImportExtension.name,
  );
  return dep ? dep.output : DEFAULT_IMPORT_MIME_TYPE;
}

/**
 * @experimental
 *
 * Mirror of {@link GetClipboardDataExtension} for the import direction.
 * Holds a per-MIME-type stack of {@link ImportMimeTypeFunction}s.
 *
 * @example
 * Route `text/html` pastes through {@link DOMImportExtension}, leaving the
 * defaults for other MIME types untouched:
 * ```ts
 * import {configExtension, defineExtension} from 'lexical';
 * import {
 *   ClipboardImportExtension,
 *   $insertGeneratedNodes,
 * } from '@lexical/clipboard';
 * import {
 *   contextValue,
 *   DOMImportExtension,
 *   ImportSource,
 *   $generateNodesFromDOMViaExtension,
 * } from '@lexical/html';
 *
 * defineExtension({
 *   name: 'app',
 *   dependencies: [
 *     DOMImportExtension,
 *     configExtension(ClipboardImportExtension, {
 *       $importMimeType: {
 *         'text/html': [
 *           (html, selection, editor) => {
 *             const parser = new DOMParser();
 *             const dom = parser.parseFromString(html, 'text/html');
 *             const nodes = $generateNodesFromDOMViaExtension(editor, dom, {
 *               context: [contextValue(ImportSource, 'paste')],
 *             });
 *             $insertGeneratedNodes(editor, nodes, selection);
 *             return true;
 *           },
 *         ],
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export const ClipboardImportExtension = defineExtension({
  build(_editor, config) {
    return config.$importMimeType;
  },
  config: safeCast<ClipboardImportConfig>({
    $importMimeType: DEFAULT_IMPORT_MIME_TYPE,
  }),
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    if (partial.$importMimeType) {
      const $importMimeType: ImportMimeTypeConfig = {...config.$importMimeType};
      for (const [k, v] of Object.entries(partial.$importMimeType)) {
        if (v) {
          const prev = $importMimeType[k];
          $importMimeType[k] = prev ? [...prev, ...v] : v;
        }
      }
      merged.$importMimeType = $importMimeType;
    }
    return merged;
  },
  name: '@lexical/clipboard/Import',
});
