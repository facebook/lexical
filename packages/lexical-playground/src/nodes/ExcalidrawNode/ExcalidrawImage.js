/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * @emails oncall+excalidraw
 * @flow strict
 * @format
 */



import type {ExcalidrawElement} from '@excalidraw/excalidraw';

import DOM from 'react';

import {exportToCanvas, exportToSvg} from '@excalidraw/excalidraw';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';

type ImageType = 'svg' | 'canvas';

type Props = {
  /**
   * The Excalidraw elements to be rendered as an image
   */
  elements: $ReadOnlyArray<ExcalidrawElement>,
  /**
   * The type of image to be rendered
   */
  imageType?: ImageType,
  /**
   * The css class applied to image to be rendered
   */
  className?: string,
  /**
   * The height of the image to be rendered
   */
  height?: number | null,
  /**
   * The width of the image to be rendered
   */
  width?: number | null,
  /**
   * Configures the export setting for SVG/Canvas
   */
  appState?: mixed,
  /**
   * The css class applied to the root element of this component
   */
  rootClassName?: string | null,
};

function setAttributes(
  imageElement: SVGElement | HTMLCanvasElement,
  className: string,
  height?: number | null,
  width?: number | null,
): SVGElement | HTMLCanvasElement {
  // Set className
  imageElement.setAttribute('class', className);
  // Set height
  if (height != null) {
    imageElement.style.maxHeight = height.toString();
  }
  if (width != null) {
    imageElement.style.maxWidth = width.toString();
  }
  return imageElement;
}

/**
 * @explorer-desc
 * A component for rendering Excalidraw elements as a static image
 */
export default function ExcalidrawImage({
  elements,
  className = '',
  height = null,
  width = null,
  appState = null,
  rootClassName = null,
}: Props): React.MixedElement {
  const [Svg, setSvg] = useState('');

  useEffect(() => {
    const setContent = async () => {
      const svg = await exportToSvg({
        elements,
        appState,
      });
      setSvg(svg);
      console.log(svg);
    };
    setContent();
  }, [elements, className, height, width, appState]);

  return (
    <div
      className={rootClassName}
      dangerouslySetInnerHTML={{__html: Svg.outerHTML}}
    />
  );
}
