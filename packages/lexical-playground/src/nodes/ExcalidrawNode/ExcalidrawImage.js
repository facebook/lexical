/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * @emails oncall+excalidraw
 * @flow strict
 * @format
 */

// $FlowFixMe: node modules are ignored by flow
import {exportToSvg} from '@excalidraw/excalidraw';
import * as React from 'react';
import {useEffect, useState} from 'react';

type ImageType = 'svg' | 'canvas';

type Props = {
  /**
   * The Excalidraw elements to be rendered as an image
   */
  elements: $ReadOnlyArray<{...}>,
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

// exportToSvg has fonts from excalidraw.com
// We don't want them to be used in open source
const removeStyleFromSvg_HACK = (svg) => {
  const styleTag = svg?.firstElementChild?.firstElementChild;
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
        elements,
        appState,
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
