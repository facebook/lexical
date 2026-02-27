/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {isMimeType, mediaFileReader} from '@lexical/utils';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {useEffect} from 'react';

import {useAttachmentStore} from '../../context/AttachmentStoreContext';
import {INSERT_ATTACHMENT_COMMAND} from '../AttachmentPlugin';
import {INSERT_IMAGE_COMMAND} from '../ImagesPlugin';

const ACCEPTABLE_IMAGE_TYPES = [
  'image/',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/webp',
];

// Acceptable attachment types (keep same as AttachmentPlugin)
const ACCEPTABLE_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-rar-compressed',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/x-msvideo',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
];

// Maximum attachment size (3MB)
const MAX_ATTACHMENT_SIZE_MB = 3;

export default function DragDropPaste(): null {
  const [editor] = useLexicalComposerContext();
  const {store} = useAttachmentStore();

  useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        (async () => {
          const filesResult = await mediaFileReader(files, [
            ...ACCEPTABLE_IMAGE_TYPES,
            ...ACCEPTABLE_ATTACHMENT_TYPES,
          ]);
          for (const {file, result} of filesResult) {
            if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
              editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                altText: file.name,
                src: result,
              });
            } else if (isMimeType(file, ACCEPTABLE_ATTACHMENT_TYPES)) {
              // Check file size
              if (file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
                console.warn(
                  `File size exceeds ${MAX_ATTACHMENT_SIZE_MB}MB limit`,
                );
                continue;
              }

              // Upload file using the store
              try {
                const stored = await store.upload({
                  file,
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                });

                // Get base64 data if the store supports it (for serialization)
                let base64Data: string | undefined;
                if (store.getConfig().serializeAsBase64) {
                  const base64 = await store.toBase64(stored.id);
                  if (base64) {
                    base64Data = base64;
                  }
                }

                editor.dispatchCommand(INSERT_ATTACHMENT_COMMAND, {
                  attachmentId: stored.id,
                  base64Data,
                  fileName: stored.fileName,
                  fileSize: stored.fileSize,
                  fileType: stored.fileType,
                  fileUrl: stored.url,
                });
              } catch (error) {
                console.error('Failed to upload attachment:', error);
              }
            }
          }
        })();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, store]);
  return null;
}
