/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export function addClassNamesToElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
) {
  classNames.forEach((className) => {
    if (className != null && typeof className === 'string') {
      element.classList.add(...className.split(' '));
    }
  });
}

export function removeClassNamesFromElement(
  element: HTMLElement,
  ...classNames: Array<string>
) {
  classNames.forEach((className) => {
    element.classList.remove(...className.split(' '));
  });
}
