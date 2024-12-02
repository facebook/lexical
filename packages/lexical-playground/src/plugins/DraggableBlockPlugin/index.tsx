/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {DraggableBlockPlugin_EXPERIMENTAL} from '@lexical/react/LexicalDraggableBlockPlugin';
import {useRef} from 'react';

const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div ref={menuRef} className="icon draggable-block-menu">
          <div className="icon" />
        </div>
      }
      targetLineComponent={
        <div ref={targetLineRef} className="draggable-block-target-line" />
      }
      isOnMenu={isOnMenu}
    />
  );
}
