/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const isFocusable = (el: HTMLElement): boolean => {
  const interactiveTags = [
    'A',
    'BUTTON',
    'INPUT',
    'SELECT',
    'TEXTAREA',
    'DETAILS',
    'SUMMARY',
  ];
  if (
    interactiveTags.includes(el.tagName) ||
    el.hasAttribute('tabindex') ||
    el.hasAttribute('contenteditable')
  ) {
    return true;
  }
  return false;
};

export const findFirstFocusableDescendant = (
  startElement: HTMLElement,
): HTMLElement | null => {
  for (const childNode of startElement.children) {
    if (!(childNode instanceof HTMLElement)) {
      continue;
    }

    if (isFocusable(childNode as HTMLElement)) {
      return childNode as HTMLElement;
    }

    const focusableChild = findFirstFocusableDescendant(
      childNode as HTMLElement,
    );

    if (focusableChild) {
      return focusableChild;
    }
  }

  return null;
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
  if (event instanceof PointerEvent) {
    return event.pointerId === -1 && event.pointerType === '';
  }

  return event?.detail === 0;
};
