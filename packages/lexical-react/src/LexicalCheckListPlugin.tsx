/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerCheckList} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

/**
 * Enables check list support, wiring up the keyboard and pointer interactions
 * that toggle the checked state of check list items. Pass
 * `disableTakeFocusOnClick` to stop the editor from taking focus when a
 * checkbox is clicked.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function CheckListPlugin({
  disableTakeFocusOnClick = false,
}: {
  disableTakeFocusOnClick?: boolean;
}): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerCheckList(editor, {disableTakeFocusOnClick});
  }, [editor, disableTakeFocusOnClick]);
  return null;
}
