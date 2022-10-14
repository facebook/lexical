/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/src/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  COMMAND_PRIORITY_NORMAL,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  LexicalEditor,
  PASTE_COMMAND,
  PasteCommandType,
} from 'lexical';
import {useEffect} from 'react';
import * as React from 'react';

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

export type Props = {
  children: JSX.Element;
};

export default function MediaUploaderPlugin({
  children,
}: Props): null | JSX.Element {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<PasteCommandType>(
        PASTE_COMMAND,
        (event: PasteCommandType) => {
          const result = onPaste(event, editor);
          if (result) {
            event.preventDefault();
          }
          return result;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event: DragEvent) => {
          const result = onDragStart(event);
          if (result) {
            event.preventDefault();
          }
          return result;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event: DragEvent) => {
          const result = onDragOver(event);
          if (result) {
            event.preventDefault();
          }
          return result;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event: DragEvent) => {
          const result = onDrop(event, editor);
          if (result) {
            event.preventDefault();
          }
          return result;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    );
  }, [editor]);
  return <div>{children}</div>;
}

function onPaste(event: PasteCommandType, editor: LexicalEditor): boolean {
  if (!(event instanceof ClipboardEvent)) {
    return false;
  }
  const dataTransfer = event.clipboardData;
  if (dataTransfer === null) {
    return false;
  }

  const files = dataTransfer.files;
  handleFileList(files, editor);

  return files.length > 0;
}

function onDragStart(event: DragEvent): boolean {
  const files = dragFiles(event);
  return files !== null && files.length > 0;
}

function onDragOver(event: DragEvent): boolean {
  const files = dragFiles(event);
  return files !== null && files.length > 0;
}

function onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const files = dragFiles(event);
  if (files !== null) {
    handleFileList(files, editor);
    return files.length > 0;
  }
  return false;
}

function dragFiles(event: DragEvent): null | FileList {
  const dataTransfer = event.dataTransfer;
  if (dataTransfer === null) {
    return null;
  }
  return dataTransfer.files;
}

function handleFileList(files: FileList, editor: LexicalEditor): void {
  const filesLength = files.length;
  for (let i = 0; i < filesLength; i++) {
    const file = files.item(i);
    const fileReader = new FileReader();
    if (file !== null) {
      fileReader.addEventListener('load', () => {
        const result = fileReader.result;
        if (typeof result === 'string' && isAcceptableImageType(file.type)) {
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            altText: file.name,
            src: result,
          });
        }
      });
      fileReader.readAsDataURL(file);
    }
  }
}
