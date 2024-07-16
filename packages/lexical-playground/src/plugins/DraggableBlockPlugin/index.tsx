/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {DraggableBlockPlugin} from '../../../../lexical-react/src/LexicalDraggableBlockPlugin';

const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export default function PlaygroundDraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element {
  return (
    <DraggableBlockPlugin
      anchorElem={anchorElem}
      menuComponent={<div className="icon draggable-block-menu" />}
      targetLineComponent={<div className="draggable-block-target-line" />}
      isOnMenu={isOnMenu}
    />
  );
}
