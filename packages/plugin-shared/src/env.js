// @flow strict
export const IS_MAC: boolean =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

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

export const isBrowserFirefox: boolean =
  typeof navigator !== 'undefined' &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

export const isBrowserSafari: boolean =
  typeof navigator !== 'undefined' &&
  /Version\/[\d.]+.*Safari/.test(navigator.userAgent);

export const canUseDOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

let documentMode = null;
if (canUseDOM && 'documentMode' in document) {
  documentMode = document.documentMode;
}

export const canUseTextInputEvent: boolean =
  canUseDOM && 'TextEvent' in window && !documentMode;

export let canUseBeforeInputEvent: boolean = false;

if (canUseDOM && 'InputEvent' in window && !documentMode) {
  canUseBeforeInputEvent = 'getTargetRanges' in new window.InputEvent('input');
}
