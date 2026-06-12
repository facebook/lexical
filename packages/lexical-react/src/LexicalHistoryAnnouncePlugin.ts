/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerHistoryAnnounce} from '@lexical/a11y';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalAriaLiveRegion} from '@lexical/react/useLexicalAriaLiveRegion';
import {useEffect} from 'react';

export interface HistoryAnnouncePluginProps {
  /**
   * Messages announced after the corresponding history command runs.
   * Hosts supply localized strings; defaults are English.
   */
  messages?: {
    undone?: string;
    redone?: string;
  };
}

/**
 * React wrapper around `registerHistoryAnnounce` from `@lexical/a11y`.
 *
 * Announces undo / redo into a polite `aria-live` region (provided by
 * `useLexicalAriaLiveRegion`) so screen readers pick up history
 * navigation.
 *
 * Hosts using `@lexical/extension` can wire the same behavior via
 * `HistoryAnnounceExtension` from `@lexical/a11y`.
 */
export function HistoryAnnouncePlugin({
  messages,
}: HistoryAnnouncePluginProps = {}): null {
  const [editor] = useLexicalComposerContext();
  const announce = useLexicalAriaLiveRegion();
  const {undone, redone} = messages || {};

  useEffect(() => {
    return registerHistoryAnnounce(editor, announce, {redone, undone});
  }, [editor, announce, undone, redone]);

  return null;
}
