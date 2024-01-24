/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {exportToSvg} from '@excalidraw/excalidraw';
import {
  ExcalidrawElement,
  NonDeleted,
} from '@excalidraw/excalidraw/types/element/types';
import {AppState, BinaryFiles} from '@excalidraw/excalidraw/types/types';
import * as React from 'react';
import {useEffect, useState} from 'react';

type ImageType = 'svg' | 'canvas';

type Props = {
  /**
   * Configures the export setting for SVG/Canvas
   */
  appState: AppState;
  /**
   * The css class applied to image to be rendered
   */
  className?: string;
  /**
   * The Excalidraw elements to be rendered as an image
   */
  elements: NonDeleted<ExcalidrawElement>[];
  /**
   * The Excalidraw elements to be rendered as an image
   */
  files: BinaryFiles;
  /**
   * The height of the image to be rendered
   */
  height?: number | null;
  /**
   * The ref object to be used to render the image
   */
  imageContainerRef: {current: null | HTMLDivElement};
  /**
   * The type of image to be rendered
   */
  imageType?: ImageType;
  /**
   * The css class applied to the root element of this component
   */
  rootClassName?: string | null;
  /**
   * The width of the image to be rendered
   */
  width?: number | null;
};

// exportToSvg has fonts from excalidraw.com
// We don't want them to be used in open source
const removeStyleFromSvg_HACK = (svg: SVGElement) => {
  const styleTag = svg?.firstElementChild?.firstElementChild;

  // Generated SVG is getting double-sized by height and width attributes
  // We want to match the real size of the SVG element
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox != null) {
    const viewBoxDimensions = viewBox.split(' ');
    svg.setAttribute('width', viewBoxDimensions[2]);
    svg.setAttribute('height', viewBoxDimensions[3]);
  }

  if (styleTag && styleTag.tagName === 'style') {
    styleTag.remove();
  }
};

/**
 * @explorer-desc
 * A component for rendering Excalidraw elements as a static image
 */
export default function ExcalidrawImage({
  elements,
  files,
  imageContainerRef,
  appState,
  rootClassName = null,
}: Props): JSX.Element {
  const [Svg, setSvg] = useState<SVGElement | null>(null);

  useEffect(() => {
    const setContent = async () => {
      const svg: SVGElement = await exportToSvg({
        appState,
        elements,
        files,
      });
      removeStyleFromSvg_HACK(svg);

      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('display', 'block');

      setSvg(svg);
    };
    setContent();
  }, [elements, files, appState]);

  return (
    <div
      ref={imageContainerRef}
      className={rootClassName ?? ''}
      dangerouslySetInnerHTML={{__html: Svg?.outerHTML ?? ''}}
    />
  );
}
