/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export const IS_MAC: boolean =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

export const IS_WINDOWS: boolean =
  typeof window !== 'undefined' && /Win/.test(window.navigator.platform);

export const IS_IOS: boolean =
  typeof navigator !== 'undefined' &&
  typeof window !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.MSStream;

export const IS_APPLE: boolean =
  typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent);

export const IS_FIREFOX: boolean =
  typeof navigator !== 'undefined' &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

export const IS_SAFARI: boolean =
  typeof navigator !== 'undefined' &&
  /Version\/[\d\.]+.*Safari/.test(navigator.userAgent);

export const IS_CHROME: boolean =
  typeof navigator !== 'undefined' &&
  /^(?=.*Chrome).*/i.test(navigator.userAgent);

export const CAN_USE_DOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

let documentMode = null;
if (CAN_USE_DOM && 'documentMode' in document) {
  documentMode = document.documentMode;
}

export const canUseTextInputEvent: boolean =
  CAN_USE_DOM && 'TextEvent' in window && !documentMode;

export let CAN_USE_BEFORE_INPUT: boolean = false;

if (CAN_USE_DOM && 'InputEvent' in window && !documentMode) {
  CAN_USE_BEFORE_INPUT = 'getTargetRanges' in new window.InputEvent('input');
}

export const CAN_USE_INTL_SEGMENTER: boolean =
  'Intl' in window && 'Segmenter' in window.Intl;
