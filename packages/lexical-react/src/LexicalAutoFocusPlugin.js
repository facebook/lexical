/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

export default function LexicalAutoFocusPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.focus();
  }, [editor]);

  useEffect(() => {
    return editor.registerTextContentListener((text) => {
      console.info('text:' + text);
    });
  }, [editor]);

  return null;
}
