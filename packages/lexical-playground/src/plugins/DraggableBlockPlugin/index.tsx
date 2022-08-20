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

const SPACE = 4;
const TARGET_LINE_HALF_HEIGHT = 2;
const DRAGGABLE_BLOCK_ELEMENT_PADDING = 24;
const DRAGGABLE_BLOCK_CLASSNAME = 'draggable-block';
const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';

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

  const top =
    targetRect.top +
    (targetRect.height - floatingElemRect.height) / 2 -
    anchorElementRect.top;
  const left =
    targetRect.left +
    DRAGGABLE_BLOCK_ELEMENT_PADDING -
    floatingElemRect.width -
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

function setTargetLine(
  targetLineElem: HTMLElement,
  targetBlockElem: HTMLElement,
  mouseY: number,
  anchorElem: HTMLElement,
) {
  const {top, left, width, height} = targetBlockElem.getBoundingClientRect();
  const {paddingLeft, paddingRight} = window.getComputedStyle(targetBlockElem);
  const {top: anchorTop, left: anchorLeft} = anchorElem.getBoundingClientRect();
  const targetPaddingLeft = parseInt(paddingLeft, 10);
  const targetPaddingRight = parseInt(paddingRight, 10);

  let lineTop = top;
  // At the bottom of the target
  if (mouseY - top > height / 2) {
    lineTop += height;
  }
  targetLineElem.style.top = `${
    lineTop - anchorTop - TARGET_LINE_HALF_HEIGHT
  }px`;
  targetLineElem.style.left = `${
    left - anchorLeft + targetPaddingLeft - SPACE
  }px`;
  targetLineElem.style.width = `${
    width - targetPaddingLeft - targetPaddingRight + SPACE * 2
  }px`;
  targetLineElem.style.opacity = '.4';
}

function useDraggableBlockMenu(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
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
    const {pageY, target} = event;
    if (!isHTMLElement(target)) {
      return false;
    }
    const targetBlockElem = getDraggableBlockElement(target);
    const targetLineElem = targetLineRef.current;
    if (targetBlockElem === null || targetLineElem === null) {
      return false;
    }
    setTargetLine(targetLineElem, targetBlockElem, pageY, anchorElem);
    // console.log('blockElement', blockElement)
    return true;
  }

  function onDrop(event: DragEvent, _editor: LexicalEditor): boolean {
    // console.log('onDrop', event, _editor)
    return false;
  }

  return createPortal(
    <>
      <div
        className="icon draggable-block-menu"
        ref={menuRef}
        draggable={true}
        onDragStart={onDragStart}>
        <div className="icon" />
      </div>
      <div className="draggable-block-target-line" ref={targetLineRef} />
    </>,
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
