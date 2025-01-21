/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalEditor} from 'lexical';

import {OverflowNode} from '@lexical/overflow';
import {useEffect, useState} from 'react';
import invariant from 'shared/invariant';

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
    // Check if OverflowNode is registered
    if (!editor.hasNodes([OverflowNode])) {
      invariant(
        false,
        'useCharacterCount: OverflowNode not registered on editor',
      );
    }
  }, [editor]);

  useEffect(() => {
    // Update character count whenever the text content changes
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
