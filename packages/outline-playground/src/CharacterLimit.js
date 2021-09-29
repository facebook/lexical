/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';

import useCharacterLimit from './useCharacterLimit';
import * as React from 'react';
import {useState} from 'react';

const CHARACTER_LIMIT = 5;

export default function CharacterLimit({
  editor,
}: {
  editor: OutlineEditor,
}): React$Node {
  const [remainingCharacters, setRemainingCharacters] = useState(0);
  useCharacterLimit(editor, CHARACTER_LIMIT, {
    remainingCharacters: setRemainingCharacters,
  });

  return (
    <span
      className={`characters-limit ${
        remainingCharacters < 0 ? 'characters-limit-exceeded' : ''
      }`}>
      {remainingCharacters}
    </span>
  );
}
