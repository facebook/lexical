/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {useEffect} from 'react';

import {INSERT_IMAGE_COMMAND} from '../ImagesPlugin';

const ACCEPTABLE_IMAGE_TYPES = [
  'image/',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/webp',
];

function isAcceptableImageType(type: string): boolean {
  for (const acceptableType of ACCEPTABLE_IMAGE_TYPES) {
    if (type.startsWith(acceptableType)) {
      return true;
    }
  }
  return false;
}

export default function DragDropPaste(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        const filesIterator = files[Symbol.iterator]();
        const handleNextFile = () => {
          const {value: file, done} = filesIterator.next();
          if (done) {
            // TODO batch history
            return;
          }
          const fileReader = new FileReader();
          fileReader.addEventListener('load', () => {
            const result = fileReader.result;
            if (
              typeof result === 'string' &&
              isAcceptableImageType(file.type)
            ) {
              editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                altText: file.name,
                src: result,
              });
            }
            handleNextFile();
          });
          fileReader.readAsDataURL(file);
        };
        handleNextFile();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);
  return null;
}
