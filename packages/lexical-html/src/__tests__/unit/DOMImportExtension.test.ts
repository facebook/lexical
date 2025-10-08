/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  $generateHtmlFromNodes,
  DOMConfig,
  DOMExtension,
  DOMImportConfig,
  DOMImportExtension,
} from '@lexical/html';
import {
  $getEditor,
  $selectAll,
  $setSelection,
  configExtension,
  defineExtension,
} from 'lexical';
import {expectHtmlToBeEqual, html} from 'lexical/src/__tests__/utils';
import {describe, test} from 'vitest';

interface ImportTestCase {
  name: string;
  inputHtml: string;
  exportHtml: string;
  importConfig?: Partial<DOMImportConfig>;
  exportConfig?: Partial<DOMConfig>;
}

function importCase(
  name: string,
  inputHtml: string,
  exportHtml: string,
): ImportTestCase {
  return {exportHtml, inputHtml, name};
}

describe('DOMImportExtension', () => {
  test.each([
    importCase(
      'center aligned',
      html`
        <div><p style="text-align: center;">Hello world!</p></div>
      `,
      html`
        <p style="text-align: center;">
          <span style="white-space: pre-wrap;">Hello world!</span>
        </p>
      `,
    ),
  ])(
    '$name',
    ({
      inputHtml,
      exportHtml,
      importConfig = {},
      exportConfig = {},
    }: ImportTestCase) => {
      const builtEditor = buildEditorFromExtensions(
        defineExtension({
          $initialEditorState: (editor) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(inputHtml, 'text/html');
            const nodes = getExtensionDependencyFromEditor(
              $getEditor(),
              DOMImportExtension,
            ).output.$importNodes(doc);
            $insertGeneratedNodes(editor, nodes, $selectAll());
            $setSelection(null);
          },
          dependencies: [
            configExtension(DOMImportExtension, importConfig),
            configExtension(DOMExtension, exportConfig),
          ],
          name: 'root',
        }),
      );
      expectHtmlToBeEqual(
        builtEditor.read(() => $generateHtmlFromNodes(builtEditor)),
        exportHtml,
      );
    },
  );
});
