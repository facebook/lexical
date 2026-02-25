/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* eslint-disable no-shadow */

import {buildEditorFromExtensions} from '@lexical/extension';
import {TailwindExtension} from '@lexical/tailwind';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {expectHtmlToBeEqual, html} from 'lexical/src/__tests__/utils';
import {describe, it} from 'vitest';

describe('TailwindExtension', () => {
  it('applies the expected classes', () => {
    const container = document.createElement('div');
    const editor = buildEditorFromExtensions({
      $initialEditorState() {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('Test!').toggleFormat('bold'),
          ),
        );
      },
      afterRegistration(editor) {
        editor.setRootElement(container);
        return () => editor.setRootElement(null);
      },
      dependencies: [TailwindExtension],
      name: '@lexical/tailwind/test',
    });
    expectHtmlToBeEqual(
      container.innerHTML,
      html`
        <p class="relative m-0" dir="auto">
          <strong class="font-bold" data-lexical-text="true">Test!</strong>
        </p>
      `,
    );
    editor.dispose();
  });
});
