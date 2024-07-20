/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

export default function GlobalInspectPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).lexicalEditor = editor;
    // eslint-disable-next-line no-console
    console.log('Lexical editor is now available as `lexicalEditor`');

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).lexicalEditor;
    };
  }, [editor]);

  return null;
}
