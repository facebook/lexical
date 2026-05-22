/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertGeneratedNodes,
  ClipboardImportExtension,
} from '@lexical/clipboard';
import {configExtension} from '@lexical/extension';
import {
  $generateNodesFromDOMViaExtension,
  contextValue,
  ImportSource,
  ImportSourceDataTransfer,
} from '@lexical/html';
import {defineExtension} from 'lexical';

/**
 * Override `ClipboardImportExtension`'s default `text/html` handler so
 * paste / drop events route through the new `DOMImportExtension`
 * pipeline (rules, schemas, preprocessors, overlays) instead of the
 * legacy `$generateNodesFromDOM`. The original `DataTransfer` and the
 * `'paste'` source kind are forwarded so a rule can `ctx.get`
 * them.
 *
 * Without this wiring, only callers that invoke
 * `$generateNodesFromDOMViaExtension` directly (e.g. the
 * `ImportHtmlButton` dialog) exercise the new pipeline — actual
 * clipboard pastes still go through the legacy importer.
 */
export const RouteHtmlPasteViaExtension = defineExtension({
  dependencies: [
    configExtension(ClipboardImportExtension, {
      $importMimeType: {
        'text/html': [
          (html, selection, editor, _next, dataTransfer) => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, 'text/html');
            const nodes = $generateNodesFromDOMViaExtension(dom, {
              context: [
                contextValue(ImportSource, 'paste'),
                contextValue(ImportSourceDataTransfer, dataTransfer),
              ],
            });
            $insertGeneratedNodes(editor, nodes, selection);
            return true;
          },
        ],
      },
    }),
  ],
  name: '@lexical/examples/dom-import/RouteHtmlPasteViaExtension',
});
