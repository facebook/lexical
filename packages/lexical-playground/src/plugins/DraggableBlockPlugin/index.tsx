/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import './index.css';

import {DraggableBlockPlugin_EXPERIMENTAL} from '@lexical/react/LexicalDraggableBlockPlugin';
import {useRef} from 'react';

/**
 * Playground wrapper for the slot-driven DraggableBlockPlugin rewrite.
 *
 * The drag handle is now rendered into each top-level block ElementNode's DOM
 * by `BlockDragHandleExtension` (wired in the playground via the editor's
 * extension list); this wrapper only mounts the drop-target line.
 *
 * The previous "+" add-block menu next to the drag handle has been dropped in
 * this iteration; equivalent functionality is available through the slash
 * menu (ComponentPickerPlugin).
 */
export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element {
  const targetLineRef = useRef<HTMLDivElement | null>(null);
  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      targetLineRef={targetLineRef}
      targetLineComponent={
        <div ref={targetLineRef} className="draggable-block-target-line" />
      }
    />
  );
}
