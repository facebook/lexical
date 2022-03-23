/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $getRoot, $getSelection} from 'lexical';
import useLayoutEffect from 'shared/useLayoutEffect';

type Props = $ReadOnly<{
  onClear?: () => void,
}>;

export default function LexicalClearEditorPlugin({onClear}: Props): React$Node {
  const [editor] = useLexicalComposerContext();
  useLayoutEffect(() => {
    return editor.registerCommandListener((type, payload) => {
      if (type === 'clearEditor') {
        editor.update(() => {
          if (onClear == null) {
            const root = $getRoot();
            const selection = $getSelection();
            const paragraph = $createParagraphNode();
            root.clear();
            root.append(paragraph);
            if (selection !== null) {
              paragraph.select();
            }
          } else {
            onClear();
          }
        });
        return true;
      }
      return false;
    }, (0: CommandListenerEditorPriority));
  }, [editor, onClear]);

  return null;
}
