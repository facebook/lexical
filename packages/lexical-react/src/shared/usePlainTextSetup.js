/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {InitialEditorStateType} from './PlainRichTextUtils';
import type {LexicalEditor} from 'lexical';

import {registerDragonSupport} from '@lexical/dragon';
import {registerPlainText} from '@lexical/plain-text';
import {mergeRegister} from '@lexical/utils';
import useLayoutEffect from 'shared/useLayoutEffect';

export default function usePlainTextSetup(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  useLayoutEffect(() => {
    return mergeRegister(
      registerPlainText(editor, initialEditorState),
      registerDragonSupport(editor),
    );
    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
}
