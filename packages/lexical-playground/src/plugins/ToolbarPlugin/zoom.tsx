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

const ZOOM_LEVELS = [50, 75, 90, 100, 125, 150, 200] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

type StyleWithZoom = CSSStyleDeclaration & {
  zoom: string;
};

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
      const editorElement = editor.getRootElement()?.parentElement;
      if (editorElement) {
        const style = editorElement.style as StyleWithZoom;
        style.zoom = `${newZoom}%`;
        updateToolbarState('zoomLevel', newZoom);
      }
    },
    [editor, updateToolbarState],
  );

  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item zoom-menu"
      buttonLabel={`${zoomLevel}%`}
      buttonIconClassName="icon"
      buttonAriaLabel="Formatting options for zoom level">
      {ZOOM_LEVELS.map((level) => (
        <DropDownItem
          key={level}
          className={'item ' + (level === zoomLevel ? 'active' : '')}
          onClick={() => handleZoomChange(level)}>
          <span className="text">{level}%</span>
        </DropDownItem>
      ))}
    </DropDown>
  );
}
