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
  initializeUnitTest(
    (testEnv) => {
      test('BaseSerializer can serialize/deserialize', async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const paragraphNode = $createParagraphNode();
          const textNode = $createTextNode('foo');
          $getRoot().append(paragraphNode);
          paragraphNode.append(textNode);
        });

        // editor.getEditorState().read(() => {
        //   console.info(serializer.serialize($getRoot()));
        // });
        const serialized = editor.serialize();
        console.info('SERIALIZED', serialized);

        editor.deserialize(serialized);
        console.info(
          'NODEMAP (after deserialize)',
          editor.getEditorState()._nodeMap,
        );

        const serialized2 = editor.serialize();

        expect(serialized).toEqual(serialized2);
      });
    },
    {
      serializer: new BaseSerializer(),
    },
  );
});
