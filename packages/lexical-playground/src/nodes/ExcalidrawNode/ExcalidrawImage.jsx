/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe: node modules are ignored by flow
import {exportToSvg} from '@excalidraw/excalidraw';
import * as React from 'react';
import {useEffect, useState} from 'react';

type ImageType = 'svg' | 'canvas';

type Props = {
  /**
   * Configures the export setting for SVG/Canvas
   */
  appState?: mixed,
  /**
   * The css class applied to image to be rendered
   */
  className?: string,
  /**
   * The Excalidraw elements to be rendered as an image
   */
  elements: $ReadOnlyArray<{...}>,
  /**
   * The height of the image to be rendered
   */
  height?: number | null,
  /**
   * The type of image to be rendered
   */
  imageType?: ImageType,
  /**
   * The css class applied to the root element of this component
   */
  rootClassName?: string | null,
  /**
   * The width of the image to be rendered
   */
  width?: number | null,
};

// exportToSvg has fonts from excalidraw.com
// We don't want them to be used in open source
const removeStyleFromSvg_HACK = (svg) => {
  const styleTag = svg?.firstElementChild?.firstElementChild;

  // Generated SVG is getting double-sized by height and width attributes
  // We want to match the real size of the SVG element
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox != null) {
    const viewBoxDimentions = viewBox.split(' ');
    svg.setAttribute('width', viewBoxDimentions[2]);
    svg.setAttribute('height', viewBoxDimentions[3]);
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
  className = '',
  height = null,
  width = null,
  appState = null,
  rootClassName = null,
}: Props): React.MixedElement {
  const [Svg, setSvg] = useState<Element | null>(null);

  useEffect(() => {
    const setContent = async () => {
      const svg: Element = await exportToSvg({
        appState,
        elements,
      });
      removeStyleFromSvg_HACK(svg);
      setSvg(svg);
    };
    setContent();
  }, [elements, appState]);

  return (
    <div
      className={rootClassName}
      dangerouslySetInnerHTML={{__html: Svg?.outerHTML}}
    />
  );
}
