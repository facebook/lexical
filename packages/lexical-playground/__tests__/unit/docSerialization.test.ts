/**
 * @jest-environment <rootDir>/packages/lexical-playground/__tests__/unit/jsdom-with-compression-environment
 */

// Jest environment should be at the very top of the file. overriding environment for this test
// because jest-environment-jsdom does not have compression APIs

/* eslint-disable header/header */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {serializedDocumentFromEditorState} from '@lexical/file';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

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
  });
});
