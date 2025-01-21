/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';

import {useCharacterCount} from './shared/useCharacterCount';

function utf8Length(text: string) {
  const textEncoder = new TextEncoder();
  return textEncoder.encode(text).length;
}

export function CharacterCountPlugin({
  charset = 'UTF-16',
}: {
  charset?: 'UTF-16' | 'UTF-8';
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const characterCount = useCharacterCount(editor, {
    strlen: (text: string) => {
      if (charset === 'UTF-8') {
        return utf8Length(text);
      } else if (charset === 'UTF-16') {
        return text.length;
      } else {
        throw new Error('Unrecognized charset');
      }
    },
  });

  return <span className="characters-count">{characterCount}</span>;
}
