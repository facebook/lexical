/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';
import {type JSX, useMemo, useState} from 'react';

import {useCharacterLimit} from './shared/useCharacterLimit';

const CHARACTER_LIMIT = 5;
let textEncoderInstance: null | TextEncoder = null;

function textEncoder(): null | TextEncoder {
  // eslint-disable-next-line no-restricted-syntax
  if (window.TextEncoder === undefined) {
    return null;
  }

  if (textEncoderInstance === null) {
    // eslint-disable-next-line no-restricted-syntax
    textEncoderInstance = new window.TextEncoder();
  }

  return textEncoderInstance;
}

function utf8Length(text: string) {
  const currentTextEncoder = textEncoder();

  if (currentTextEncoder === null) {
    // http://stackoverflow.com/a/5515960/210370
    const m = encodeURIComponent(text).match(/%[89ABab]/g);
    return text.length + (m ? m.length : 0);
  }

  return currentTextEncoder.encode(text).length;
}

function DefaultRenderer({remainingCharacters}: {remainingCharacters: number}) {
  return (
    <span
      className={`characters-limit ${
        remainingCharacters < 0 ? 'characters-limit-exceeded' : ''
      }`}>
      {remainingCharacters}
    </span>
  );
}

/**
 * Tracks the length of the editor's text content against `maxLength` and
 * renders the number of remaining characters, marking any overflowing text so
 * it can be styled. Length is measured in either `'UTF-8'` or `'UTF-16'`
 * (default) code units via the `charset` prop, and the display can be
 * customized with the `renderer` prop.
 *
 * @returns The element produced by `renderer` (by default a `<span>` showing
 * the number of remaining characters).
 */
export function CharacterLimitPlugin({
  charset = 'UTF-16',
  maxLength = CHARACTER_LIMIT,
  renderer = DefaultRenderer,
}: {
  charset: 'UTF-8' | 'UTF-16';
  maxLength: number;
  renderer?: ({
    remainingCharacters,
  }: {
    remainingCharacters: number;
  }) => JSX.Element;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const [remainingCharacters, setRemainingCharacters] = useState(maxLength);

  const characterLimitProps = useMemo(
    () => ({
      remainingCharacters: setRemainingCharacters,
      strlen: (text: string) => {
        if (charset === 'UTF-8') {
          return utf8Length(text);
        } else if (charset === 'UTF-16') {
          return text.length;
        } else {
          throw new Error('Unrecognized charset');
        }
      },
    }),
    [charset],
  );

  useCharacterLimit(editor, maxLength, characterLimitProps);

  return renderer({remainingCharacters});
}
