/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createHashtagNode} from '@lexical/hashtag';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

describe('LexicalHashtagNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('HashtagNode.exportJSON() should return and object conforming to the expected schema', () => {
      const {editor} = testEnv;
      editor.update(() => {
        const node = $createHashtagNode('therickestrickofall');
        // If you broke this test, you changed the public interface of a
        // serialized Lexical Core Node. Please ensure the correct adapter
        // logic is in place in the corresponding importJSON  method
        // to accomodate these changes.
        expect(node.exportJSON()).toStrictEqual({
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text: 'therickestrickofall',
          type: 'hashtag',
          version: 1,
        });
      });
    });
  });
});
