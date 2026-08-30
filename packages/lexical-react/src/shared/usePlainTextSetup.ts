/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerDragonSupport} from '@lexical/dragon';
import {registerPlainText} from '@lexical/plain-text';
import {type LexicalEditor, mergeRegister} from 'lexical';

import useLayoutEffect from './useLayoutEffect';

export function usePlainTextSetup(editor: LexicalEditor): void {
  useLayoutEffect(() => {
    return mergeRegister(
      registerPlainText(editor),
      registerDragonSupport(editor),
    );
  }, [editor]);
}
