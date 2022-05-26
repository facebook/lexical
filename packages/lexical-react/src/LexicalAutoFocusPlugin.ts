/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

export function AutoFocusPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.focus(() => {
      const activeElement = document.activeElement;
      const rootElement = editor.getRootElement() as HTMLDivElement;
      if (rootElement !== null && !rootElement.contains(activeElement)) {
        rootElement.focus({preventScroll: true});
      }
    });
  }, [editor]);

  return null;
}
