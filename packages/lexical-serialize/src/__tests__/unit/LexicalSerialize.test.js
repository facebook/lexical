/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeUnitTest} from '../../../../lexical/src/__tests__/utils';
import {
  BaseSerializer,
  $serializeRoot,
  $deserializeRoot,
} from '@lexical/serialize';
import {$getRoot, $createParagraphNode, $createTextNode} from 'lexical';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LexicalSerialize tests', () => {
  initializeUnitTest((testEnv) => {
    test('BaseSerializer can serialize/deserialize', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraphNode = $createParagraphNode();
        const textNode = $createTextNode();
        $getRoot().append(paragraphNode);
        paragraphNode.append(textNode);
      });

      const serializer = new BaseSerializer();
      // editor.getEditorState().read(() => {
      //   console.info(serializer.serialize($getRoot()));
      // });
      const serialized = editor.getEditorState().read(() => {
        return $serializeRoot(serializer, editor.getEditorState());
      });
      console.info(serialized);

      await editor.update(() => {
        $deserializeRoot(serializer, serialized);
      });

      const serialized2 = editor.getEditorState().read(() => {
        return $serializeRoot(serializer, editor.getEditorState());
      });
      console.info(serialized2);
    });
  });
});
