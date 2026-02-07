/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {
  $isAutoLinkNode,
  $isLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $findMatchingParent,
  $wrapNodeInElement,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  ElementNode,
  getDOMSelectionFromTarget,
  isHTMLElement,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import {useEffect, useRef, useState} from 'react';

import {useAttachmentStore} from '../../context/AttachmentStoreContext';
import {
  $createAttachmentNode,
  $isAttachmentNode,
  AttachmentNode,
  AttachmentPayload,
} from '../../nodes/AttachmentNode';
import Button from '../../ui/Button';
import {DialogActions} from '../../ui/Dialog';
import FileInput from '../../ui/FileInput';
import FilePreview from '../../ui/FilePreview';

export type InsertAttachmentPayload = Readonly<AttachmentPayload>;

export const INSERT_ATTACHMENT_COMMAND: LexicalCommand<InsertAttachmentPayload> =
  createCommand('INSERT_ATTACHMENT_COMMAND');

const MAX_SIZE_MB = 3;
const ACCEPTABLE_TYPES = [
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
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/x-msvideo',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/flac',
];

export function InsertAttachmentUploadedDialogBody({
  onClick,
}: {
  onClick: (payload: InsertAttachmentPayload) => void;
}) {
  const {store, showDemoWarning} = useAttachmentStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadFile = (files: FileList | null) => {
    if (!files || !files[0]) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];

    // Check file size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      console.warn(`File size exceeds the maximum limit of ${MAX_SIZE_MB}MB`);
      setSelectedFile(null);
      return;
    }

    // Check file type
    const fileType = file.type || getFileTypeFromName(file.name);
    if (!ACCEPTABLE_TYPES.includes(fileType)) {
      console.warn('File type is not supported');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (selectedFile) {
      setIsUploading(true);
      try {
        const fileType =
          selectedFile.type || getFileTypeFromName(selectedFile.name);

        // Upload file using the store
        const stored = await store.upload({
          file: selectedFile,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType,
        });

        // Get base64 data if the store supports it (for serialization)
        let base64Data: string | undefined;
        if (store.getConfig().serializeAsBase64) {
          const base64 = await store.toBase64(stored.id);
          if (base64) {
            base64Data = base64;
          }
        }

        onClick({
          attachmentId: stored.id,
          base64Data,
          fileName: stored.fileName,
          fileSize: stored.fileSize,
          fileType: stored.fileType,
          fileUrl: stored.url,
        });
      } catch (error) {
        console.error('Failed to upload attachment:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const isDisabled = !selectedFile || isUploading;

  return (
    <>
      {showDemoWarning && (
        <div className="AttachmentPlugin__demoWarning">
          Demo mode: Files will be lost on page reload
        </div>
      )}
      <FileInput
        label="File Upload"
        onChange={loadFile}
        accept={ACCEPTABLE_TYPES.join(',')}
        data-test-id="attachment-modal-file-upload"
      />
      {selectedFile && (
        <FilePreview
          fileName={selectedFile.name}
          fileSize={formatFileSize(selectedFile.size)}
          fileType={selectedFile.type || getFileTypeFromName(selectedFile.name)}
        />
      )}
      <DialogActions>
        <Button
          data-test-id="attachment-modal-file-upload-btn"
          disabled={isDisabled}
          onClick={handleSubmit}>
          {isUploading ? 'Uploading...' : 'Confirm'}
        </Button>
      </DialogActions>
    </>
  );
}

export function InsertAttachmentDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const hasModifier = useRef(false);

  useEffect(() => {
    hasModifier.current = false;
    const handler = (e: KeyboardEvent) => {
      hasModifier.current = e.altKey;
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [activeEditor]);

  const onClick = (payload: InsertAttachmentPayload) => {
    activeEditor.dispatchCommand(INSERT_ATTACHMENT_COMMAND, payload);
    onClose();
  };

  return <InsertAttachmentUploadedDialogBody onClick={onClick} />;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeFromName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    avi: 'video/x-msvideo',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    flac: 'audio/flac',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    png: 'image/png',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    rar: 'application/x-rar-compressed',
    txt: 'text/plain',
    wav: 'audio/wav',
    webp: 'image/webp',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
};

export const extractAttachmentNodes = (root: ElementNode): AttachmentNode[] => {
  const attachmentNodes: AttachmentNode[] = [];

  function traverse(node: LexicalNode) {
    if ($isAttachmentNode(node)) {
      attachmentNodes.push(node);
    }

    // If node is an ElementNode, traverse its children
    if (node instanceof ElementNode) {
      const children = node.getChildren();
      children.forEach(traverse);
    }
  }

  traverse(root);
  return attachmentNodes;
};

export default function AttachmentPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([AttachmentNode])) {
      throw new Error(
        'AttachmentPlugin: AttachmentNode not registered on editor',
      );
    }

    return mergeRegister(
      editor.registerCommand<InsertAttachmentPayload>(
        INSERT_ATTACHMENT_COMMAND,
        (payload) => {
          const attachmentNode = $createAttachmentNode(payload);
          $insertNodes([attachmentNode]);
          if ($isRootOrShadowRoot(attachmentNode.getParentOrThrow())) {
            $wrapNodeInElement(
              attachmentNode,
              $createParagraphNode,
            ).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return $onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return $onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return $onDrop(event, editor);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      // 에디터가 정리될 때 첨부파일 objectURL들을 정리
      () => {
        return editor.read(() => {
          try {
            const root = $getRoot();
            const attachmentNodes = extractAttachmentNodes(root);
            attachmentNodes.forEach((node) => {
              URL.revokeObjectURL(node.getFileUrl());
            });
          } catch (error) {
            console.warn(
              'Failed to cleanup attachment URLs during editor cleanup:',
              error,
            );
          }
        });
      },
    );
  }, [editor]);

  return null;
}

const TRANSPARENT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = document.createElement('img');
img.src = TRANSPARENT_IMAGE;

function $onDragStart(event: DragEvent): boolean {
  const node = $getAttachmentNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData('text/plain', '_');
  dataTransfer.setDragImage(img, 0, 0);
  dataTransfer.setData(
    'application/x-lexical-drag',
    JSON.stringify({
      data: {
        fileName: node.getFileName(),
        fileSize: node.getFileSize(),
        fileType: node.getFileType(),
        fileUrl: node.getFileUrl(),
        key: node.getKey(),
      },
      type: 'attachment',
    }),
  );

  return true;
}

function $onDragover(event: DragEvent): boolean {
  const node = $getAttachmentNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropAttachment(event)) {
    event.preventDefault();
  }
  return true;
}

function $onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = $getAttachmentNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragAttachmentData(event);
  if (!data) {
    return false;
  }
  const existingLink = $findMatchingParent(
    node,
    (parent): parent is LinkNode =>
      !$isAutoLinkNode(parent) && $isLinkNode(parent),
  );
  event.preventDefault();
  if (canDropAttachment(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_ATTACHMENT_COMMAND, data);
    if (existingLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, existingLink.getURL());
    }
  }
  return true;
}

function $getAttachmentNodeInSelection(): AttachmentNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isAttachmentNode(node) ? node : null;
}

function getDragAttachmentData(
  event: DragEvent,
): null | InsertAttachmentPayload {
  const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
  if (!dragData) {
    return null;
  }
  const {type, data} = JSON.parse(dragData);
  if (type !== 'attachment') {
    return null;
  }

  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropAttachment(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    isHTMLElement(target) &&
    !target.closest('code, span.attachment-node') &&
    isHTMLElement(target.parentElement) &&
    target.parentElement.closest('div.ContentEditable__root')
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }

  return range;
}
