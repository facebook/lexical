/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {serializedDocumentFromEditorState} from '@lexical/file';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $insertNodes,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {docFromHash, docToHash} from '../../src/utils/docSerialization';

describe('docSerialization', () => {
  initializeUnitTest((testEnv) => {
    describe('docToHash/docFromHash round-trips', () => {
      it('with empty state', async () => {
        const {editor} = testEnv;
        const emptyState = editor.getEditorState();
        const doc = serializedDocumentFromEditorState(emptyState, {
          source: 'Playground',
        });
        expect(await docFromHash(await docToHash(doc))).toEqual(doc);
      });
      it('with some state', async () => {
        const {editor} = testEnv;
        editor.update(
          () => {
            const p = $createParagraphNode();
            p.append($createTextNode(`It's alive!`));
            $getRoot().append($createParagraphNode());
          },
          {discrete: true},
        );
        const hasState = editor.getEditorState();
        const doc = serializedDocumentFromEditorState(hasState, {
          source: 'Playground',
        });
        expect(await docFromHash(await docToHash(doc))).toEqual(doc);
      });
    });

    describe('Preserve indent serializing HTML <-> Lexical', () => {
      it('preserves indentation', async () => {
        const {editor} = testEnv;
        const parser = new DOMParser();
        const htmlString = `<p class="PlaygroundEditorTheme__paragraph" dir="auto">
  <span style="white-space: pre-wrap;">paragraph</span>
</p>
<h1 class="PlaygroundEditorTheme__h1" dir="auto">
  <span style="white-space: pre-wrap;">heading</span>
</h1>
<blockquote class="PlaygroundEditorTheme__quote" dir="auto">
  <span style="white-space: pre-wrap;">quote</span>
</blockquote>
<p class="PlaygroundEditorTheme__paragraph" dir="auto" style="padding-inline-start: 80px;">
  <span style="white-space: pre-wrap;">paragraph</span>
</p>
<h1 class="PlaygroundEditorTheme__h1" dir="auto" style="padding-inline-start: 80px;">
  <span style="white-space: pre-wrap;">heading</span>
</h1>
<blockquote class="PlaygroundEditorTheme__quote" dir="auto" style="padding-inline-start: 80px;">
  <span style="white-space: pre-wrap;">quote</span>
</blockquote>`;
        const dom = parser.parseFromString(htmlString, 'text/html');
        await editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
        });

        const expectedEditorState = {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                textFormat: 0,
                textStyle: '',
                type: 'paragraph',
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'heading',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                tag: 'h1',
                type: 'heading',
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'quote',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'quote',
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'paragraph',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 2,
                textFormat: 0,
                textStyle: '',
                type: 'paragraph',
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'heading',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 2,
                tag: 'h1',
                type: 'heading',
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'quote',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 2,
                type: 'quote',
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        };

        const editorState = editor.getEditorState().toJSON();
        expect(editorState).toEqual(expectedEditorState);
        let htmlString2;
        await editor.update(() => {
          htmlString2 = $generateHtmlFromNodes(editor);
        });
        expect(htmlString2).toBe(
          '<p><span style="white-space: pre-wrap;">paragraph</span></p><h1><span style="white-space: pre-wrap;">heading</span></h1><blockquote><span style="white-space: pre-wrap;">quote</span></blockquote><p style="padding-inline-start: 80px;"><span style="white-space: pre-wrap;">paragraph</span></p><h1 style="padding-inline-start: 80px;"><span style="white-space: pre-wrap;">heading</span></h1><blockquote style="padding-inline-start: 80px;"><span style="white-space: pre-wrap;">quote</span></blockquote>',
        );
      });
    });
  });
});
