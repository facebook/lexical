/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @ts-ignore
import type {NodeKey} from 'lexical';

import {$createParagraphNode, $getRoot, ParagraphNode} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import {registerNodesOfTypeListener} from '../../index';

describe('LexicalRootHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    it('$registerNodesOfTypeListener', async () => {
      const editor = testEnv.editor;

      const paragraphKeys: Array<NodeKey> = [];
      async function appendParagraph() {
        await editor.update(() => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          paragraphKeys.push(paragraph.getKey());
          root.append(paragraph);
        });
      }

      await appendParagraph();
      const cb = jest.fn(() => undefined);
      registerNodesOfTypeListener(editor, ParagraphNode, cb, true);
      await appendParagraph();

      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb.mock.calls[0]).toEqual([new Set(paragraphKeys.slice(0, 1))]);
      expect(cb.mock.calls[1]).toEqual([new Set(paragraphKeys)]);
    });
  });
});
