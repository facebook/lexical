/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$getDocument} from 'lexical';

let element: HTMLElement | undefined;

/** Decode a complete HTML entity name, without its ampersand or semicolon. */
export function decodeNativeNamedCharacterReference(
  name: string,
): string | undefined {
  if (!/^[a-zA-Z][\da-zA-Z]{0,31}$/.test(name)) {
    return undefined;
  }
  if (typeof document !== 'undefined') {
    const ownerDocument = $getDocument();
    if (element === undefined || element.ownerDocument !== ownerDocument) {
      element = ownerDocument.createElement('i');
    }
    // The safe native parser accepts strings under Trusted Types enforcement.
    // Do not install a policy or fall back to an HTML sink if this API exists.
    const reference = '&' + name + ';';
    if ('setHTML' in element && typeof element.setHTML === 'function') {
      element.setHTML(reference);
    } else {
      // Older native parsers use a Trusted Types sink. Applications with a
      // stricter CSP can explicitly configure a DOM-free decoder instead.
      element.innerHTML = reference;
    }
    const decoded = element.textContent || '';
    // HTML also recognizes some unterminated names. A partially matched
    // name (e.g. notit) leaves its semicolon, so preserve it as unknown.
    return (decoded.endsWith(';') && name !== 'semi') || decoded === reference
      ? undefined
      : decoded;
  }
  // Legacy DOM-free editors preserve named references as text. Opt into
  // SSRMarkdownExtension for full named-reference decoding without a DOM.
  return undefined;
}
