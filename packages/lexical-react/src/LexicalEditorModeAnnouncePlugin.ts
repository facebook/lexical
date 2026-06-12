/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerEditorModeAnnounce} from '@lexical/a11y';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalAriaLiveRegion} from '@lexical/react/useLexicalAriaLiveRegion';
import {useEffect} from 'react';

export interface EditorModeAnnouncePluginProps {
  /**
   * Messages announced when the editor transitions between modes.
   * Hosts supply localized strings; defaults are English.
   */
  messages?: {
    editable?: string;
    readOnly?: string;
  };
}

/**
 * React wrapper around `registerEditorModeAnnounce` from `@lexical/a11y`.
 *
 * Announces `editor.setEditable(true|false)` transitions into a polite
 * `aria-live` region (provided by `useLexicalAriaLiveRegion`).
 *
 * @deprecated A pure Lexical implementation is available in `@lexical/a11y` as EditorModeAnnounceExtension
 */
export function EditorModeAnnouncePlugin({
  messages,
}: EditorModeAnnouncePluginProps = {}): null {
  const [editor] = useLexicalComposerContext();
  const announce = useLexicalAriaLiveRegion();
  const {editable, readOnly} = messages || {};

  useEffect(() => {
    return registerEditorModeAnnounce(editor, announce, {editable, readOnly});
  }, [editor, announce, editable, readOnly]);

  return null;
}
