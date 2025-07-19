/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export class NodeOverlay {
  overlay: HTMLDivElement;
  cssClassName: string = 'overlayWrapper';

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'overlay-wrapper';
    this.overlay.style.display = 'block';
    this.overlay.style.position = 'relative';
    this.overlay.style.outline = 'thick solid #f95738';
    this.overlay.style.background = 'rgba(250, 240, 202, 0.2)';
    this.overlay.className = this.cssClassName;

    document.body.appendChild(this.overlay);
  }

  removeForElement(elementId?: string) {
    if (this.overlay.dataset.id === elementId) {
      this.overlay.style.display = 'none';
    }
  }

  remove() {
    this.overlay.remove();
  }

  wrapElement(element: HTMLElement, elementId: string) {
    const boundingClientRect = element.getBoundingClientRect();
    this.overlay.style.top = `${boundingClientRect.top}px`;
    this.overlay.style.left = `${boundingClientRect.left}px`;
    this.overlay.style.width = `${boundingClientRect.width}px`;
    this.overlay.style.height = `${boundingClientRect.height}px`;
    this.overlay.style.position = 'absolute';
    this.overlay.style.display = 'block';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.dataset.id = elementId;
  }
}
