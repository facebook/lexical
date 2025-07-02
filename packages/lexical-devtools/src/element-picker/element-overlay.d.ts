/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { BoundingBox, ElementOverlayOptions } from './utils';
export default class ElementOverlay {
    overlay: HTMLDivElement;
    shadowContainer: HTMLDivElement;
    shadowRoot: ShadowRoot;
    usingShadowDOM?: boolean;
    constructor(options: ElementOverlayOptions);
    addToDOM(parent: Node, useShadowDOM: boolean): void;
    removeFromDOM(): void;
    captureCursor(): void;
    ignoreCursor(): void;
    setBounds({ x, y, width, height }: BoundingBox): void;
}
//# sourceMappingURL=element-overlay.d.ts.map