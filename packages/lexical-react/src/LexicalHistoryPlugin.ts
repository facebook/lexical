/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {HistoryState} from '@lexical/history';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import {useHistory} from './shared/useHistory';

export {createEmptyHistoryState} from '@lexical/history';

export type {HistoryState};

/**
 * Adds undo/redo support to the editor by tracking changes in a
 * {@link HistoryState}. Pass `delay` to control how long (in milliseconds)
 * consecutive changes are merged into a single history entry, or
 * `externalHistoryState` to share a history stack across editors.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function HistoryPlugin({
  delay,
  externalHistoryState,
}: {
  delay?: number;
  externalHistoryState?: HistoryState;
}): null {
  const [editor] = useLexicalComposerContext();

  useHistory(editor, externalHistoryState, delay);

  return null;
}
