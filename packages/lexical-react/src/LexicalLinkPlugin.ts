/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LinkNode, TOGGLE_LINK_COMMAND, toggleLink} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

type Props = {
  validateUrl?: (url: string) => boolean;
};

const alwaysValidUrlFn = () => true;

export function LinkPlugin({validateUrl = alwaysValidUrlFn}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([LinkNode])) {
      throw new Error('LinkPlugin: LinkNode not registered on editor');
    }
    return mergeRegister(
      editor.registerCommand(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          if (payload === null) {
            toggleLink(payload);
            return true;
          } else if (typeof payload === 'string') {
            if (validateUrl(payload)) {
              toggleLink(payload);
              return true;
            }
            return false;
          } else {
            const {url, target, rel} = payload;
            toggleLink(url, {rel, target});
            return true;
          }
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if (
            !$isRangeSelection(selection) ||
            selection.isCollapsed() ||
            !(payload instanceof ClipboardEvent) ||
            payload.clipboardData == null
          ) {
            return false;
          }
          const clipboardText = payload.clipboardData.getData('text');
          if (!validateUrl(clipboardText)) {
            return false;
          }
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, clipboardText);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, validateUrl]);

  return null;
}
