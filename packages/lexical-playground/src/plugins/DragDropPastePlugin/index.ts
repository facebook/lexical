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

// Function to infer file type from file extension
const getFileTypeFromName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'zip':
      return 'application/zip';
    case 'rar':
      return 'application/x-rar-compressed';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'mp4':
      return 'video/mp4';
    case 'avi':
      return 'video/x-msvideo';
    case 'mov':
      return 'video/quicktime';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'flac':
      return 'audio/flac';
    default:
      return '';
  }
};

export default function DragDropPaste(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        (async () => {
          // Read all acceptable file types
          const allAcceptableTypes = [
            ...ACCEPTABLE_IMAGE_TYPES,
            ...ACCEPTABLE_ATTACHMENT_TYPES,
          ];

          const filesResult = await mediaFileReader(files, allAcceptableTypes);

          for (const {file, result} of filesResult) {
            // Determine file type (infer from extension if no mime type)
            const fileType = file.type || getFileTypeFromName(file.name);

            // Check if it's an image type (images have priority)
            if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
              // Insert image directly without size check
              editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                altText: file.name,
                src: result,
              });
              continue;
            }

            // Check if it's an acceptable attachment type
            const isAcceptableAttachment =
              ACCEPTABLE_ATTACHMENT_TYPES.includes(fileType) ||
              ACCEPTABLE_ATTACHMENT_TYPES.some((type) =>
                fileType.startsWith(type),
              );

            if (!isAcceptableAttachment) {
              console.warn(`Unsupported file type: ${file.name} (${fileType})`);
              continue;
            }

            // Check attachment file size
            if (file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
              console.warn(
                `File "${file.name}" exceeds the maximum size limit of ${MAX_ATTACHMENT_SIZE_MB}MB`,
              );
              continue;
            }

            // Insert as attachment
            editor.dispatchCommand(INSERT_ATTACHMENT_COMMAND, {
              fileName: file.name,
              fileSize: file.size,
              fileType: fileType,
              fileUrl: result,
            });
          }
        })();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);
  return null;
}
