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

export interface EditorModeAnnouncePluginProps {
  /**
   * Messages announced when the editor transitions between modes. Hosts
   * supply localized strings; defaults are English.
   */
  messages?: {
    editable?: string;
    readOnly?: string;
  };
}

const DEFAULT_EDITABLE = 'Editor is editable';
const DEFAULT_READ_ONLY = 'Editor is read-only';

/**
 * Announces editor mode transitions (`editor.setEditable(true|false)`) into
 * a polite `aria-live` region so screen readers pick up the change. The
 * `aria-readonly` attribute on the editor root is already managed by
 * `LexicalContentEditableElement`; this plugin only contributes the
 * announcement.
 */
export function EditorModeAnnouncePlugin({
  messages,
}: EditorModeAnnouncePluginProps = {}): null {
  const [editor] = useLexicalComposerContext();
  const announce = useAriaLiveRegion();
  const {
    editable: editableMessage = DEFAULT_EDITABLE,
    readOnly: readOnlyMessage = DEFAULT_READ_ONLY,
  } = messages || {};

  useEffect(() => {
    return editor.registerEditableListener(editable => {
      announce(editable ? editableMessage : readOnlyMessage);
    });
  }, [editor, announce, editableMessage, readOnlyMessage]);

  return null;
}
