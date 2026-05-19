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
   *
   * Apps add a stack under a brand-new key to register a brand-new MIME
   * type — be sure to also add it to {@link priority} so that it actually
   * gets tried during import.
   */
  $importMimeType: ImportMimeTypeConfig;
  /**
   * The MIME types tried by {@link $insertDataTransferForRichText}, in
   * priority order. The first MIME type whose `DataTransfer.getData`
   * returns a non-empty value (and whose stack claims it) wins.
   *
   * Apps register additional MIME types by adding both an entry here and
   * a handler stack in {@link $importMimeType}. New entries from a
   * partial config are appended to the end of the priority list (i.e.
   * tried after the built-ins) and de-duplicated against existing
   * entries.
   */
  priority: readonly string[];
}

/**
 * Default MIME-type priority list reproducing the legacy
 * {@link $insertDataTransferForRichText} behavior:
 *
 * `application/x-lexical-editor` → `text/html` → `text/plain` →
 * `text/uri-list` (Webkit-only text fallback).
 *
 * @experimental
 */
export const DEFAULT_IMPORT_MIME_TYPE_PRIORITY: readonly string[] = [
  'application/x-lexical-editor',
  'text/html',
  'text/plain',
  'text/uri-list',
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
const $defaultLexicalEditorImporter: ImportMimeTypeFunction = (
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
const $defaultHtmlImporter: ImportMimeTypeFunction = (
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
const $defaultPlainTextImporter: ImportMimeTypeFunction = (data, selection) => {
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
  // `text/uri-list` is a Webkit-only payload that drops behave-like text;
  // reuse the plain-text handler so a URL drop on a rich-text editor
  // inserts as plain text rather than being ignored.
  'text/uri-list': [$defaultPlainTextImporter],
};

/**
 * Output of {@link ClipboardImportExtension}: the merged configuration
 * plus a self-contained {@link $insertDataTransfer} function that owns
 * the entire paste-side iteration over the priority list. Apps look this
 * up via peer-dependency and call it directly; {@link
 * $insertDataTransferForRichText} delegates to it.
 *
 * @experimental
 */
export interface ClipboardImportOutput extends ClipboardImportConfig {
  /**
   * Try every MIME type in `priority` order against the `DataTransfer`,
   * invoking the configured stack for the first one that has a non-empty
   * payload. Returns `true` if any stack claimed the data.
   */
  $insertDataTransfer(
    dataTransfer: DataTransfer,
    selection: BaseSelection,
    editor: LexicalEditor,
  ): boolean;
}

function callImportMimeTypeFunctionStack(
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

function $runImport(
  config: ClipboardImportConfig,
  dataTransfer: DataTransfer,
  selection: BaseSelection,
  editor: LexicalEditor,
): boolean {
  // Read once for the iOS Safari heuristic that skips text/html when it
  // matches text/plain verbatim (iOS Safari autocorrect produces a
  // text/html payload identical to the plain text).
  const plainString = dataTransfer.getData('text/plain');
  const seen = new Set<string>();
  for (const mime of config.priority) {
    if (seen.has(mime)) {
      continue;
    }
    seen.add(mime);
    const data = dataTransfer.getData(mime);
    if (!data) {
      continue;
    }
    if (mime === 'text/html' && data === plainString) {
      continue;
    }
    if (
      callImportMimeTypeFunctionStack(
        config.$importMimeType[mime],
        data,
        selection,
        editor,
      )
    ) {
      return true;
    }
  }
  return false;
}

const DEFAULT_OUTPUT: ClipboardImportOutput = {
  $importMimeType: DEFAULT_IMPORT_MIME_TYPE,
  $insertDataTransfer(dataTransfer, selection, editor) {
    return $runImport(
      {
        $importMimeType: DEFAULT_IMPORT_MIME_TYPE,
        priority: DEFAULT_IMPORT_MIME_TYPE_PRIORITY,
      },
      dataTransfer,
      selection,
      editor,
    );
  },
  priority: DEFAULT_IMPORT_MIME_TYPE_PRIORITY,
};

/**
 * @internal
 *
 * Look up the {@link ClipboardImportOutput} on the editor. Returns a
 * static default-backed output when no {@link ClipboardImportExtension}
 * is configured, so callers can always invoke `output.$insertDataTransfer`
 * regardless of whether the editor opted in.
 */
export function $getImportOutput(editor: LexicalEditor): ClipboardImportOutput {
  const dep = getPeerDependencyFromEditor<typeof ClipboardImportExtension>(
    editor,
    ClipboardImportExtension.name,
  );
  return dep ? dep.output : DEFAULT_OUTPUT;
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
  build(_editor, config): ClipboardImportOutput {
    return {
      $importMimeType: config.$importMimeType,
      $insertDataTransfer(dataTransfer, selection, editor) {
        return $runImport(config, dataTransfer, selection, editor);
      },
      priority: config.priority,
    };
  },
  config: safeCast<ClipboardImportConfig>({
    $importMimeType: DEFAULT_IMPORT_MIME_TYPE,
    priority: DEFAULT_IMPORT_MIME_TYPE_PRIORITY,
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
    if (partial.priority) {
      // Replace rather than append: apps that want their own MIME type
      // in a specific position (e.g. before text/html) need full control
      // over the ordering. To preserve the built-ins, include them
      // explicitly in the new list (see {@link DEFAULT_IMPORT_MIME_TYPE_PRIORITY}).
      merged.priority = partial.priority;
    }
    return merged;
  },
  name: '@lexical/clipboard/Import',
});
