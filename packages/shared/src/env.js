export const IS_MAC = (
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
)

export const IS_IOS =
  typeof navigator !== 'undefined' &&
  typeof window !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.MSStream;

export const IS_APPLE =
  typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent);

export const IS_FIREFOX =
  typeof navigator !== 'undefined' &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

export const IS_SAFARI =
  typeof navigator !== 'undefined' &&
  /Version\/[\d\.]+.*Safari/.test(navigator.userAgent);

export const isBrowserFirefox =
  typeof navigator !== 'undefined' &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

export const isBrowserSafari =
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

export const canUseTextInputEvent =
  canUseDOM && 'TextEvent' in window && !documentMode;

export let canUseBeforeInputEvent = false;

if (canUseDOM && 'InputEvent' in window && !documentMode) {
  canUseBeforeInputEvent = 'getTargetRanges' in new window.InputEvent('input');
}
