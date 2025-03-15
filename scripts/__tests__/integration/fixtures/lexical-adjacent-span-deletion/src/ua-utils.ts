export function isChromium(): boolean {
  return (
    navigator.userAgent.indexOf('Chrome/') !== -1 ||
    navigator.userAgent.indexOf('Chromium/') !== -1
  );
}

export function isSafari(): boolean {
  return navigator.userAgent.indexOf('Safari/') !== -1 && !isChromium();
}
