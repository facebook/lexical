/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useAriaLiveRegion} from '@lexical/react/useAriaLiveRegion';
import {useEffect} from 'react';

const EDITABLE_MESSAGE = 'Editor is editable';
const READ_ONLY_MESSAGE = 'Editor is read-only';

export default function EditorModeAnnouncePlugin(): null {
  const [editor] = useLexicalComposerContext();
  const announce = useAriaLiveRegion();

  useEffect(() => {
    return editor.registerEditableListener(editable => {
      const rootElement = editor.getRootElement();
      if (rootElement !== null) {
        rootElement.setAttribute('aria-readonly', editable ? 'false' : 'true');
      }
      announce(editable ? EDITABLE_MESSAGE : READ_ONLY_MESSAGE);
    });
  }, [editor, announce]);

  return null;
}
