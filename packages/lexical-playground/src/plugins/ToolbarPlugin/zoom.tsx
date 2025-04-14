/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import * as React from 'react';
import {useCallback} from 'react';

import {useToolbarState} from '../../context/ToolbarContext';
import DropDown, {DropDownItem} from '../../ui/DropDown';

const ZOOM_LEVELS = ['Fit', 50, 75, 90, 100, 125, 150, 200] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

export default function Zoom({
  editor,
  disabled = false,
}: {
  editor: LexicalEditor;
  disabled?: boolean;
}): JSX.Element {
  const {toolbarState, updateToolbarState} = useToolbarState();
  const {zoomLevel} = toolbarState;

  const handleZoomChange = useCallback(
    (newZoom: ZoomLevel) => {
      // Apply zoom to editor container
      const editorElement = editor.getRootElement()?.parentElement;
      if (editorElement) {
        if (newZoom === 'Fit') {
          // Reset zoom temporarily to get actual content width
          editorElement.style.zoom = '100%';

          // Calculate zoom level to fit content width
          const containerWidth = editorElement.parentElement?.clientWidth || 0;
          const contentWidth = editorElement.scrollWidth;

          const fitZoom = Math.min(
            100,
            Math.floor((containerWidth / contentWidth) * 100),
          );

          // Apply the calculated fit zoom
          editorElement.style.zoom = `${fitZoom}%`;
          updateToolbarState('zoomLevel', 'Fit');
        } else {
          editorElement.style.zoom = `${newZoom}%`;
          updateToolbarState('zoomLevel', newZoom);
        }
      }
    },
    [editor, updateToolbarState],
  );

  const isCurrentZoomLevel = (level: ZoomLevel) => {
    if (level === 'Fit' && zoomLevel === 'Fit') {
      return true;
    }
    if (typeof level === 'number' && typeof zoomLevel === 'number') {
      return level === zoomLevel;
    }
    return false;
  };

  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item zoom-menu"
      buttonLabel={zoomLevel === 'Fit' ? 'Fit' : `${zoomLevel}%`}
      buttonIconClassName="icon"
      buttonAriaLabel="Formatting options for zoom level">
      <DropDownItem
        key="fit"
        className={'item ' + (isCurrentZoomLevel('Fit') ? 'active' : '')}
        onClick={() => handleZoomChange('Fit')}>
        <span className="text">Fit</span>
      </DropDownItem>
      <div className="divider" />
      {ZOOM_LEVELS.slice(1).map((level) => (
        <DropDownItem
          key={level}
          className={'item ' + (isCurrentZoomLevel(level) ? 'active' : '')}
          onClick={() => handleZoomChange(level)}>
          <span className="text">{level}%</span>
        </DropDownItem>
      ))}
    </DropDown>
  );
}
