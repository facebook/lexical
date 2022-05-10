/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeUnitTest} from '../../../../lexical/src/__tests__/utils';
import BaseSerializer from '@lexical/serialize';
import {$getRoot} from 'lexical';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LexicalSerialize tests', () => {
  initializeUnitTest((testEnv) => {
    test('BaseSerializer can serialize/deserialize', async () => {
      const {editor} = testEnv;
      const serializer = new BaseSerializer();
      editor.getEditorState().read(() => {
        console.info(serializer.serialize($getRoot()));
      });
    });
  });
});
