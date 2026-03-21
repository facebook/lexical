/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$selectAll, $setSelection, defineExtension} from 'lexical';
import {expectHtmlToBeEqual, html} from 'lexical/src/__tests__/utils';
import {describe, it} from 'vitest';

import {buildHTMLConfig} from '../../src/buildHTMLConfig';
import {$createImageNode} from '../../src/nodes/ImageNode';
import {ImagesExtension} from '../../src/plugins/ImagesExtension';

const ImageTestExtension = defineExtension({
  dependencies: [ImagesExtension],
  html: buildHTMLConfig(),
  name: '[test]',
});

describe('ImageNode HTML serialization', () => {
  describe('ImageNode export', () => {
    it('with no caption', async () => {
      using editor = buildEditorFromExtensions(ImageTestExtension);
      editor.update(
        () => {
          const imageNode = $createImageNode({
            altText: '',
            src: '/test/image.jpg',
          });
          $insertGeneratedNodes(editor, [imageNode], $selectAll());
        },
        {discrete: true},
      );
      const doc = editor.read(() => $generateHtmlFromNodes(editor, null));
      expectHtmlToBeEqual(
        doc,
        html`
          <p>
            <img
              alt=""
              height="inherit"
              src="/test/image.jpg"
              width="inherit" />
          </p>
        `,
      );
    });
    it('with plain text caption', async () => {
      using editor = buildEditorFromExtensions(ImageTestExtension);
      editor.update(
        () => {
          const imageNode = $createImageNode({
            altText: '',
            showCaption: true,
            src: '/test/image.jpg',
          });
          imageNode.__caption.update(
            () => {
              $selectAll().insertRawText('caption text');
              $setSelection(null);
            },
            {discrete: true},
          );
          $insertGeneratedNodes(editor, [imageNode], $selectAll());
        },
        {discrete: true},
      );
      const doc = editor.read(() => $generateHtmlFromNodes(editor, null));
      expectHtmlToBeEqual(
        doc,
        html`
          <div role="paragraph">
            <figure>
              <img
                alt=""
                height="inherit"
                src="/test/image.jpg"
                width="inherit" />
              <figcaption>
                <span style="white-space: pre-wrap">caption text</span>
              </figcaption>
            </figure>
          </div>
        `,
      );
    });
  });
});
