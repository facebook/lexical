/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {Position} from '../../nodes/InlineImageNode';

import '../../nodes/InlineImageNode.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$wrapNodeInElement, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
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
  LexicalCommand,
  LexicalEditor,
} from 'lexical';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {CAN_USE_DOM} from 'shared/canUseDOM';

import {
  $createInlineImageNode,
  $isInlineImageNode,
  InlineImageNode,
  InlineImagePayload,
} from '../../nodes/InlineImageNode';
import Button from '../../ui/Button';
import {DialogActions} from '../../ui/Dialog';
import FileInput from '../../ui/FileInput';
import Select from '../../ui/Select';
import TextInput from '../../ui/TextInput';

export type InsertInlineImagePayload = Readonly<InlineImagePayload>;

const getDOMSelection = (targetWindow: Window | null): Selection | null =>
  CAN_USE_DOM ? (targetWindow || window).getSelection() : null;

export const INSERT_INLINE_IMAGE_COMMAND: LexicalCommand<InlineImagePayload> =
  createCommand('INSERT_INLINE_IMAGE_COMMAND');

export function InsertInlineImageDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const hasModifier = useRef(false);

  const [src, setSrc] = useState('');
  const [altText, setAltText] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [position, setPosition] = useState<Position>('left');

  const isDisabled = src === '';

  const handleShowCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowCaption(e.target.checked);
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPosition(e.target.value as Position);
  };

  const loadImage = (files: FileList | null) => {
    const reader = new FileReader();
    reader.onload = function () {
      if (typeof reader.result === 'string') {
        setSrc(reader.result);
      }
      return '';
    };
    if (files !== null) {
      reader.readAsDataURL(files[0]);
    }
  };

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

  const handleOnClick = () => {
    const payload = {altText, position, showCaption, src};
    activeEditor.dispatchCommand(INSERT_INLINE_IMAGE_COMMAND, payload);
    onClose();
  };

  return (
    <>
      <div style={{marginBottom: '1em'}}>
        <FileInput
          label="Image Upload"
          onChange={loadImage}
          accept="image/*"
          data-test-id="image-modal-file-upload"
        />
      </div>
      <div style={{marginBottom: '1em'}}>
        <TextInput
          label="Alt Text"
          placeholder="Descriptive alternative text"
          onChange={setAltText}
          value={altText}
          data-test-id="image-modal-alt-text-input"
        />
      </div>

      <Select
        style={{marginBottom: '1em', width: '290px'}}
        label="Position"
        name="position"
        id="position-select"
        onChange={handlePositionChange}>
        <option value="left">Left</option>
        <option value="right">Right</option>
        <option value="full">Full Width</option>
      </Select>

      <div className="Input__wrapper">
        <input
          id="caption"
          className="InlineImageNode_Checkbox"
          type="checkbox"
          checked={showCaption}
          onChange={handleShowCaptionChange}
        />
        <label htmlFor="caption">Show Caption</label>
      </div>

      <DialogActions>
        <Button
          data-test-id="image-modal-file-upload-btn"
          disabled={isDisabled}
          onClick={() => handleOnClick()}>
          Confirm
        </Button>
      </DialogActions>
    </>
  );
}

export default function InlineImagePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([InlineImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertInlineImagePayload>(
        INSERT_INLINE_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createInlineImageNode(payload);
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return onDrop(event, editor);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);

  return null;
}

const TRANSPARENT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = document.createElement('img');
img.src = TRANSPARENT_IMAGE;

function onDragStart(event: DragEvent): boolean {
  const node = getImageNodeInSelection();
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
        altText: node.__altText,
        caption: node.__caption,
        height: node.__height,
        key: node.getKey(),
        showCaption: node.__showCaption,
        src: node.__src,
        width: node.__width,
      },
      type: 'image',
    }),
  );

  return true;
}

function onDragover(event: DragEvent): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return true;
}

function onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragImageData(event);
  if (!data) {
    return false;
  }
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_INLINE_IMAGE_COMMAND, data);
  }
  return true;
}

function getImageNodeInSelection(): InlineImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isInlineImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertInlineImagePayload {
  const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
  if (!dragData) {
    return null;
  }
  const {type, data} = JSON.parse(dragData);
  if (type !== 'image') {
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

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    target &&
    target instanceof HTMLElement &&
    !target.closest('code, span.editor-image') &&
    target.parentElement &&
    target.parentElement.closest('div.ContentEditable__root')
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const target = event.target as null | Element | Document;
  const targetWindow =
    target == null
      ? null
      : target.nodeType === 9
      ? (target as Document).defaultView
      : (target as Element).ownerDocument.defaultView;
  const domSelection = getDOMSelection(targetWindow);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error('Cannot get the selection when dragging');
  }

  return range;
}
