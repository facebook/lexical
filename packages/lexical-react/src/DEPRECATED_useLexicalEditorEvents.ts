/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {InputEvents} from './shared/useEditorEvents';
import type {LexicalEditor} from 'lexical';

import {useEditorEvents} from './shared/useEditorEvents';

export function useLexicalEditorEvents(
  events: InputEvents,
  editor: LexicalEditor,
): void {
  useEditorEvents(events, editor);
}
