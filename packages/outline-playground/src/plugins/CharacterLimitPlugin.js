/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {useCharacterLimit} from 'outline-react/useOutlineCharacterLimit';

import * as React from 'react';
import {useMemo, useState} from 'react';

const CHARACTER_LIMIT = 5;

let textEncoderInstance = null;
function textEncoder(): null | TextEncoder {
  if (window.TextEncoder === undefined) {
    return null;
  }
  if (textEncoderInstance === null) {
    textEncoderInstance = new window.TextEncoder();
  }
  return textEncoderInstance;
}

function utf8Length(text: string) {
  const currentTextEncoder = textEncoder();
  if (currentTextEncoder === null) {
    // http://stackoverflow.com/a/5515960/210370
    var m = encodeURIComponent(text).match(/%[89ABab]/g);
    return text.length + (m ? m.length : 0);
  }
  return currentTextEncoder.encode(text).length;
}

export default function CharacterLimitPlugin({
  charset = 'UTF-16',
}: {
  charset: 'UTF-8' | 'UTF-16',
}): React$Node {
  const [editor] = useOutlineComposerContext();
  const [remainingCharacters, setRemainingCharacters] = useState(0);
  const characterLimitProps = useMemo(
    () => ({
      remainingCharacters: setRemainingCharacters,
      strlen: (text) => {
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
  useCharacterLimit(editor, CHARACTER_LIMIT, characterLimitProps);

  return (
    <span
      className={`characters-limit ${
        remainingCharacters < 0 ? 'characters-limit-exceeded' : ''
      }`}>
      {remainingCharacters}
    </span>
  );
}
