/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineExtension, safeCast} from 'lexical';

import {decodeNativeNamedCharacterReference} from './decodeNamedReference';

/**
 * Decode a complete HTML entity name, without `&` or `;`. Return undefined for
 * an unknown name. The result is literal text and is never parsed again.
 */
export type NamedCharacterReferenceDecoder = (
  name: string,
) => string | undefined;

export interface MarkdownConfig {
  readonly decodeNamedCharacterReference: NamedCharacterReferenceDecoder;
}

/**
 * Configures Markdown import and shortcuts for this editor. It does not
 * register nodes or shortcuts. Native named-reference decoding is the default;
 * SSRMarkdownExtension supplies a DOM-free decoder through a separate entry.
 */
export const MarkdownExtension = defineExtension({
  config: safeCast<MarkdownConfig>({
    decodeNamedCharacterReference: decodeNativeNamedCharacterReference,
  }),
  name: '@lexical/markdown/Markdown',
});
