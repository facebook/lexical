/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {selectionAlwaysOnDisplay} from '@lexical/utils';
import {useEffect} from 'react';

type Props = Readonly<{
  onReposition?: (node: readonly HTMLElement[]) => void;
}>;

/**
 * Keeps the visual selection highlight on display even when the editor loses
 * focus, which is useful when interacting with toolbars or other controls
 * outside the editor. Pass `onReposition` to be notified when the highlighted
 * range elements are recomputed.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function SelectionAlwaysOnDisplay({onReposition}: Props): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return selectionAlwaysOnDisplay(editor, onReposition);
  }, [editor, onReposition]);

  return null;
}
