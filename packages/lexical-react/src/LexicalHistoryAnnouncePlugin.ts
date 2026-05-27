/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useAriaLiveRegion} from '@lexical/react/useAriaLiveRegion';
import {
  COMMAND_PRIORITY_LOW,
  mergeRegister,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

export interface HistoryAnnouncePluginProps {
  /**
   * Messages announced after the corresponding history command runs. Hosts
   * supply localized strings; defaults are English.
   */
  messages?: {
    undone?: string;
    redone?: string;
  };
}

const DEFAULT_UNDONE = 'Undone';
const DEFAULT_REDONE = 'Redone';

/**
 * Announces undo / redo into a polite `aria-live` region so screen readers
 * pick up history navigation. The announcement fires at
 * `COMMAND_PRIORITY_LOW` so the history extension's own handler runs first
 * and is unaffected; the handler returns `false` to keep the command chain
 * intact.
 */
export function HistoryAnnouncePlugin({
  messages,
}: HistoryAnnouncePluginProps = {}): null {
  const [editor] = useLexicalComposerContext();
  const announce = useAriaLiveRegion();
  const {
    undone: undoneMessage = DEFAULT_UNDONE,
    redone: redoneMessage = DEFAULT_REDONE,
  } = messages || {};

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        UNDO_COMMAND,
        () => {
          announce(undoneMessage);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        REDO_COMMAND,
        () => {
          announce(redoneMessage);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, announce, undoneMessage, redoneMessage]);

  return null;
}
