/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { ElementOverlayOptions } from './utils';
type ElementCallback<T> = (el: HTMLElement) => T;
type ElementPickerOptions = {
    parentElement?: Node;
    useShadowDOM?: boolean;
    onClick?: ElementCallback<void>;
    onHover?: ElementCallback<void>;
    elementFilter?: ElementCallback<boolean | HTMLElement>;
};
export default class ElementPicker {
    private overlay;
    private active;
    private options?;
    private target?;
    private mouseX?;
    private mouseY?;
    private tickReq?;
    constructor(overlayOptions?: ElementOverlayOptions);
    start(options: ElementPickerOptions): boolean;
    stop(): void;
    private handleMouseMove;
    private handleClick;
    private tick;
    private updateTarget;
}
export {};
//# sourceMappingURL=element-picker.d.ts.map