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
export declare const getElementBounds: (el: HTMLElement) => BoundingBox;
//# sourceMappingURL=utils.d.ts.map