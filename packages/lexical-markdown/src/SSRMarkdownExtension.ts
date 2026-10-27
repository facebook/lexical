/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {characterEntities} from 'character-entities';
import {configExtension, defineExtension} from 'lexical';

import {MarkdownExtension, type NamedCharacterReferenceDecoder} from '.';

/** The full HTML entity table, suitable for servers and Web Workers. */
export const decodeFullNamedCharacterReference: NamedCharacterReferenceDecoder =
  name =>
    Object.prototype.hasOwnProperty.call(characterEntities, name)
      ? characterEntities[name]
      : undefined;

/**
 * Enables full named-reference decoding without a DOM. Import this entry
 * explicitly: the default @lexical/markdown entry does not include its table.
 */
export const SSRMarkdownExtension = defineExtension({
  dependencies: [
    configExtension(MarkdownExtension, {
      decodeNamedCharacterReference: decodeFullNamedCharacterReference,
    }),
  ],
  name: '@lexical/markdown/SSRMarkdown',
});
