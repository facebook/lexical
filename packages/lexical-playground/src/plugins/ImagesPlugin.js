/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';
import {$log, $getSelection} from 'lexical';
import {$createImageNode, ImageNode} from '../nodes/ImageNode';

import yellowFlowerImage from '../images/image/yellow-flower.jpg';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function ImagesPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    return editor.addListener(
      'command',
      (type) => {
        if (type === 'insertImage') {
          $log('insertImage');
          const selection = $getSelection();
          if (selection !== null) {
            const imageNode = $createImageNode(
              yellowFlowerImage,
              'Yellow flower in tilt shift lens',
              500,
            );
            selection.insertNodes([imageNode]);
          }
          return true;
        }
        return false;
      },
      EditorPriority,
    );
  }, [editor]);
  return null;
}
