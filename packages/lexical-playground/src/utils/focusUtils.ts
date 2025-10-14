/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export const findFirstFocusableDescendant = (
  startElement: HTMLElement,
): HTMLElement | null => {
  const focusableSelector =
    'button, a[href], input, select, textarea, details, summary [tabindex], [contenteditable]';

  const focusableDescendants = startElement.querySelector(
    focusableSelector,
  ) as HTMLElement;

  return focusableDescendants;
};

export const focusNearestDescendant = (
  startElement: HTMLElement,
): HTMLElement | null => {
  const el = findFirstFocusableDescendant(startElement);
  el?.focus();
  return el;
};

export const isKeyboardInput = (
  event: MouseEvent | PointerEvent | React.MouseEvent,
): boolean => {
  if ('pointerId' in event && 'pointerType' in event) {
    return event.pointerId === -1 && event.pointerType === '';
  }

  return event?.detail === 0;
};
