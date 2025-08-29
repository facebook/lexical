/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export function setDomHiddenUntilFound(dom: HTMLElement): void {
  // @ts-expect-error
  dom.hidden = 'until-found';
}

export function domOnBeforeMatch(dom: HTMLElement, callback: () => void): void {
  dom.onbeforematch = callback;
}
