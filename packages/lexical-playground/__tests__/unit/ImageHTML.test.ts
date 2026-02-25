/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$selectAll, $setSelection} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {buildHTMLConfig} from 'packages/lexical-playground/src/buildHTMLConfig';
import {describe, it} from 'vitest';

import {$createImageNode, ImageNode} from '../../src/nodes/ImageNode';

describe('ImageNode HTML serialization', () => {
  initializeUnitTest(
    (testEnv) => {
      describe('ImageNode export', () => {
        it('with no caption', async () => {
          const {editor} = testEnv;
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
          const {editor} = testEnv;
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
    },
    {html: buildHTMLConfig(), nodes: [ImageNode]},
  );
});
