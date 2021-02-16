// @flow

import type {OutlineEditor, ViewModel} from 'outline';

import * as React from 'react';

import {useEffect, useState} from 'react';

const CHARACTER_LIMIT = 10;

export default function CharacterLimit({
  editor,
}: {
  editor: OutlineEditor,
}): React$Node {
  const [charactersOver, setCharactersOver] = useState(0);

  useEffect(() => {
    return editor.addUpdateListener((viewModel: ViewModel) => {
      const characters = editor.getTextContent().length;
      if (characters > CHARACTER_LIMIT) {
        const diff = characters - CHARACTER_LIMIT;
        setCharactersOver(diff);
      } else if (charactersOver > 0) {
        setCharactersOver(0);
      }
    });
  }, [charactersOver, editor]);

  return charactersOver > 0 ? (
    <span className="characters-over">
      Character Limit: <span>-{charactersOver}</span>
    </span>
  ) : null;
}
