/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand, LexicalEditor, NodeKey} from 'lexical';
import type {JSX} from 'react';

import './AttachmentNode.css';

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGSTART_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {Suspense, useCallback, useEffect, useRef, useState} from 'react';

import joinClasses from '../utils/joinClasses';
import {$isAttachmentNode} from './AttachmentNode';

// file type to icon mapping
// use the object key as acceptable mime type
const getFileIcon = (fileType: string, fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📋';
    case 'zip':
    case 'rar':
      return '📦';
    case 'txt':
      return '📄';
    case 'csv':
      return '📊';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return '🖼️';
    case 'mp4':
    case 'avi':
    case 'mov':
      return '🎥';
    case 'mp3':
    case 'wav':
    case 'flac':
      return '🎵';
    default:
      // if no match, use the default icon
      return '📎';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DELETE_ATTACHMENT_COMMAND: LexicalCommand<
  MouseEvent | KeyboardEvent
> = createCommand('DELETE_ATTACHMENT_COMMAND');

export default function AttachmentComponent({
  fileName,
  fileSize,
  fileType,
  fileUrl,
  nodeKey,
}: {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const [isHovered, setIsHovered] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const isEditable = useLexicalEditable();
  const attachmentRef = useRef<HTMLDivElement>(null);
  const activeEditorRef = useRef<LexicalEditor | null>(null);

  // Floating UI setup
  const {refs, floatingStyles, context} = useFloating({
    middleware: [offset(8), flip(), shift({padding: 8})],
    onOpenChange: (open) => {
      if (!open) {
        setShowFloatingToolbar(false);
      }
    },
    open: isSelected,
    placement: 'bottom',
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const {getReferenceProps, getFloatingProps} = useInteractions([
    click,
    dismiss,
  ]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowFloatingToolbar(false);
  }, [fileName, fileUrl]);

  const $onEnter = useCallback(
    (event: KeyboardEvent) => {
      const latestSelection = $getSelection();
      if (
        isSelected &&
        $isNodeSelection(latestSelection) &&
        latestSelection.getNodes().length === 1
      ) {
        event.preventDefault();
        handleDownload();
        return true;
      }
      return false;
    },
    [isSelected, handleDownload],
  );

  const $onEscape = useCallback(
    (event: KeyboardEvent) => {
      if (
        activeEditorRef.current === attachmentRef.current ||
        event.target === attachmentRef.current
      ) {
        $setSelection(null);
        editor.update(() => {
          setSelected(false);
          const parentRootElement = editor.getRootElement();
          if (parentRootElement !== null) {
            parentRootElement.focus();
          }
        });
        return true;
      }
      return false;
    },
    [editor, setSelected],
  );

  const $onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected) {
        event.preventDefault();
        editor.dispatchCommand(DELETE_ATTACHMENT_COMMAND, event);
        return true;
      }
      return false;
    },
    [isSelected, editor],
  );

  const onClick = useCallback(
    (payload: MouseEvent) => {
      const event = payload;

      if (
        event.target === attachmentRef.current ||
        attachmentRef.current?.contains(event.target as Node)
      ) {
        if (event.shiftKey) {
          setSelected(!isSelected);
        } else {
          clearSelection();
          setSelected(true);
        }

        // Show floating toolbar when selecting
        if (isEditable) {
          setShowFloatingToolbar(true);
        }
        return true;
      }

      return false;
    },
    [isSelected, setSelected, clearSelection, isEditable],
  );

  const handleDelete = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isAttachmentNode(node)) {
        node.remove();
      }
    });
    setShowFloatingToolbar(false);
  }, [editor, nodeKey]);

  const handleToolbarClose = useCallback(() => {
    setShowFloatingToolbar(false);
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((event: DragEvent) => {
    if (event.target === attachmentRef.current) {
      setIsDragging(true);
      const dragImage = new Image();
      dragImage.src =
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      event.dataTransfer?.setDragImage(dragImage, 0, 0);
      event.dataTransfer!.effectAllowed = 'move';
      return true;
    }
    return false;
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const unregister = mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_, activeEditor) => {
          activeEditorRef.current = activeEditor;
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        onClick,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_ENTER_COMMAND, $onEnter, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        $onEscape,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<MouseEvent>(
        DELETE_ATTACHMENT_COMMAND,
        () => {
          handleDelete();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => {
          return handleDragStart(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    return unregister;
  }, [
    editor,
    isSelected,
    nodeKey,
    $onEnter,
    $onEscape,
    $onDelete,
    onClick,
    handleDelete,
    handleDragStart,
    setSelected,
  ]);

  // Set floating UI reference
  useEffect(() => {
    if (attachmentRef.current) {
      refs.setReference(attachmentRef.current);
    }
  }, [refs]);

  // Handle drag events
  useEffect(() => {
    const element = attachmentRef.current;
    if (!element) {
      return;
    }

    const onDragEnd = () => handleDragEnd();

    element.addEventListener('dragend', onDragEnd);

    return () => {
      element.removeEventListener('dragend', onDragEnd);
    };
  }, [handleDragEnd]);

  const fileIcon = getFileIcon(fileType, fileName);
  const formattedFileSize = formatFileSize(fileSize);

  return (
    <Suspense fallback={null}>
      <div
        ref={attachmentRef}
        className={joinClasses(
          'AttachmentNode__container',
          isEditable && 'draggable',
          isDragging && 'dragging',
          isHovered && 'hovered',
          isSelected && 'selected',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable={isEditable && isSelected}
        {...getReferenceProps()}>
        <div className="AttachmentNode__icon">{fileIcon}</div>

        <div className="AttachmentNode__content">
          <div className="AttachmentNode__filename" title={fileName}>
            {fileName}
          </div>
          <div className="AttachmentNode__filesize">{formattedFileSize}</div>
        </div>
      </div>

      {/* Floating Toolbar */}
      {isSelected && showFloatingToolbar && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}>
            <AttachmentFloatingToolbar
              editor={editor}
              nodeKey={nodeKey}
              fileName={fileName}
              fileUrl={fileUrl}
              onDelete={handleToolbarClose}
            />
          </div>
        </FloatingPortal>
      )}
    </Suspense>
  );
}

interface AttachmentFloatingToolbarProps {
  editor: LexicalEditor;
  nodeKey: string;
  fileName: string;
  fileUrl: string;
  onDelete: () => void;
}

function AttachmentFloatingToolbar({
  editor,
  nodeKey,
  fileName,
  fileUrl,
  onDelete,
}: AttachmentFloatingToolbarProps): JSX.Element {
  const isEditable = useLexicalEditable();
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileName, fileUrl]);

  const handleDelete = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isAttachmentNode(node)) {
        node.remove();
      }
    });
    onDelete();
  }, [editor, nodeKey, onDelete]);

  return (
    <div className="AttachmentNode__floatingToolbar">
      <button
        type="button"
        className="AttachmentNode__toolbarButton"
        onClick={handleDownload}
        title="download attachment"
        aria-label="download attachment">
        <i className="export" />
      </button>
      {isEditable && (
        <button
          type="button"
          className="AttachmentNode__toolbarButton AttachmentNode__toolbarButton--delete"
          onClick={handleDelete}
          title="delete attachment"
          aria-label="delete attachment">
          <i className="clear" />
        </button>
      )}
    </div>
  );
}
