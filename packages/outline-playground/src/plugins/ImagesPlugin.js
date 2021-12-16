/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'outline';

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {useEffect} from 'react';
import {$log, $getSelection, createEditorStateRef} from 'outline';
import {ImageNode, $createImageNode} from '../nodes/ImageNode';

import yellowFlowerImage from '../images/image/yellow-flower.jpg';

const EditorPriority: CommandListenerEditorPriority = 0;

function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

export default function ImagesPlugin(): React$Node {
  const [editor] = useOutlineComposerContext();

  useEffect(() => {
    const removeCommandListener = editor.addListener(
      'command',
      (type) => {
        if (type === 'insertImage') {
          $log('insertImage');
          const selection = $getSelection();
          if (selection !== null) {
            const ref = createEditorStateRef(createUID(), null);
            const imageNode = $createImageNode(
              yellowFlowerImage,
              'Yellow flower in tilt shift lens',
              500,
              ref,
            );
            selection.insertNodes([imageNode]);
          }
          return true;
        }
        return false;
      },
      EditorPriority,
    );

    const removeImageNode = editor.registerNodes([ImageNode]);

    return () => {
      removeCommandListener();
      removeImageNode();
    };
  }, [editor]);
  return null;
}
