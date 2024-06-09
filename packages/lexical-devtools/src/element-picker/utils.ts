/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementOverlayStyleOptions {
  background?: string;
  borderColor?: string;
  borderStyle?: string;
  borderRadius?: string;
  borderWidth?: string;
  boxSizing?: string;
  cursor?: string;
  position?: string;
  zIndex?: string;
}

export type ElementOverlayOptions = {
  className?: string;
  style?: ElementOverlayStyleOptions;
};

export const getElementBounds = (el: HTMLElement): BoundingBox => {
  const rect = el.getBoundingClientRect();
  return {
    height: el.offsetHeight,
    width: el.offsetWidth,
    x: window.pageXOffset + rect.left,
    y: window.pageYOffset + rect.top,
  };
};
