/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalEditor,
} from 'lexical';
import * as React from 'react';
import {DragEvent as ReactDragEvent, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {ImageNode} from '../../nodes/ImageNode';
import {isHTMLElement} from '../../utils/guard';

const DRAGGABLE_BLOCK_CLASSNAME = 'draggable-block';
const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';
const DRAGGABLE_BLOCK_ELEMENT_PADDING = 24;
const SPACE = 4;

function getDraggableBlockElement(element: HTMLElement): HTMLElement | null {
  return element.closest(`.${DRAGGABLE_BLOCK_CLASSNAME}`);
}

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

function setMenuPosition(
  targetElem: HTMLElement | null,
  floatingElem: HTMLElement,
  anchorElem: HTMLElement,
) {
  if (!targetElem) {
    floatingElem.style.opacity = '0';
    floatingElem.style.top = '-10000px';
    floatingElem.style.left = '-10000px';
    return;
  }

  const targetRect = targetElem.getBoundingClientRect();
  const floatingElemRect = floatingElem.getBoundingClientRect();
  const anchorElementRect = anchorElem.getBoundingClientRect();

  const top = targetRect.top - anchorElementRect.top;
  const left =
    targetRect.left +
    DRAGGABLE_BLOCK_ELEMENT_PADDING -
    floatingElemRect.width -
    SPACE -
    anchorElementRect.left;

  floatingElem.style.opacity = '1';
  floatingElem.style.top = `${top}px`;
  floatingElem.style.left = `${left}px`;
}

function setDragImage(
  dataTransfer: DataTransfer,
  draggableBlockElem: HTMLElement,
) {
  const {transform} = draggableBlockElem.style;

  // Remove dragImage borders
  draggableBlockElem.style.transform = 'translateZ(0)';
  dataTransfer.setDragImage(draggableBlockElem, 0, 0);

  setTimeout(() => {
    draggableBlockElem.style.transform = transform;
  });
}

function useDraggableBlockMenu(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [draggableBlockElem, setDraggableBlockElem] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = event.target;
      if (!isHTMLElement(target)) {
        setDraggableBlockElem(null);
        return;
      }

      if (isOnMenu(target)) {
        return;
      }

      const _draggableBlockElem = getDraggableBlockElement(target);
      setDraggableBlockElem(_draggableBlockElem);
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  useEffect(() => {
    if (menuRef.current) {
      setMenuPosition(draggableBlockElem, menuRef.current, anchorElem);
    }
  }, [anchorElem, draggableBlockElem]);

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          return onDrop(event, editor);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);

  function onDragStart(event: ReactDragEvent<HTMLDivElement>): void {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer || !draggableBlockElem) {
      return;
    }
    setDragImage(dataTransfer, draggableBlockElem);
  }

  function onDragover(event: DragEvent): boolean {
    // console.log('onDragover', event)
    const target = event.target;
    if (!isHTMLElement(target)) {
      return false;
    }
    // const blockElement = getDraggableBlockElement(target);
    // console.log('blockElement', blockElement)
    return false;
  }

  function onDrop(event: DragEvent, _editor: LexicalEditor): boolean {
    // console.log('onDrop', event, _editor)
    return false;
  }

  return createPortal(
    <div
      className="draggable-block-menu"
      ref={menuRef}
      draggable={true}
      onDragStart={onDragStart}
    />,
    anchorElem,
  );
}

export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  return useDraggableBlockMenu(editor, anchorElem);
}
