/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {DraggableBlockPlugin_EXPERIMENTAL} from '@lexical/react/LexicalDraggableBlockPlugin';
import {useRef, useState} from 'react';
import FloatingComponentPickerMenu from './floatingComponentPickerMenu';

const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const [draggableElement, setDraggableElement] = useState<HTMLElement | null>(
    null,
  );
  const [insertInPreviousBlock, setInsertInPreviousBlock] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  function insertBlock(e: React.MouseEvent) {
    setShowFloatingMenu(true);
    setInsertInPreviousBlock(e.altKey || e.ctrlKey);
  }

  function onElementChanged(element: HTMLElement | null) {
    setDraggableElement(element);
    // setInsertInPreviousBlock(false);
    setShowFloatingMenu(false);
  }

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div ref={menuRef} className="icon draggable-block-menu">
          <button
            title="Click to add below"
            className="icon icon-plus"
            onClick={insertBlock}
          />
          <div className="icon" />
          {showFloatingMenu && (
            <FloatingComponentPickerMenu
              draggableElement={draggableElement}
              closeMenu={() => setShowFloatingMenu(false)}
              insertInPreviousBlock={insertInPreviousBlock}
            />
          )}
        </div>
      }
      targetLineComponent={
        <div ref={targetLineRef} className="draggable-block-target-line" />
      }
      isOnMenu={isOnMenu}
      onElementChanged={onElementChanged}
    />
  );
}
