/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalEditor} from 'lexical';

import {useEffect, useState} from 'react';

type OptionalProps = {
  strlen?: (input: string) => number;
};

export function useCharacterCount(
  editor: LexicalEditor,
  optional: OptionalProps = Object.freeze({}),
): number {
  const {strlen = (input) => input.length} = optional;
  const [characterCount, setCharacterCount] = useState(0);

  useEffect(() => {
    const unregisterTextContentListener = editor.registerTextContentListener(
      (currentText: string) => {
        setCharacterCount(strlen(currentText));
      },
    );

    return () => {
      unregisterTextContentListener();
    };
  }, [editor, strlen]);

  return characterCount;
}
