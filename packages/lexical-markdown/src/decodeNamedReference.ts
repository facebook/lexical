/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {decodeNamedCharacterReference} from 'decode-named-character-reference';
import {$getDocument} from 'lexical';

let element: HTMLElement | undefined;

export function decodeNamedReference(name: string): string | false {
  if (typeof document !== 'undefined') {
    const ownerDocument = $getDocument();
    if (element === undefined || element.ownerDocument !== ownerDocument) {
      element = ownerDocument.createElement('i');
    }
    // The safe native parser accepts strings under Trusted Types enforcement.
    // Do not install a policy or fall back to an HTML sink if this API exists.
    if ('setHTML' in element && typeof element.setHTML === 'function') {
      const reference = '&' + name + ';';
      element.setHTML(reference);
      const decoded = element.textContent || '';
      // HTML also recognizes some unterminated names. A partially matched
      // name (e.g. notit) leaves its semicolon, so preserve it as unknown.
      return (decoded.endsWith(';') && name !== 'semi') || decoded === reference
        ? false
        : decoded;
    }
  }
  // This dependency's export conditions select a tiny DOM decoder in browsers
  // and a separate table for Node/worker builds. The package build must leave
  // that import external so consumers retain the platform-specific choice.
  // Older browsers without setHTML use its HTML sink; strict Trusted Types
  // requires an explicitly selected DOM-free build if no safe parser exists.
  return decodeNamedCharacterReference(name);
}
