/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {registerDragonSupport} from '@lexical/dragon';
import {registerRichText} from '@lexical/rich-text';
import {mergeRegister} from '@lexical/utils';
import useLayoutEffect from 'shared/useLayoutEffect';

export function useRichTextSetup(editor: LexicalEditor): void {
  useLayoutEffect(() => {
    return mergeRegister(
      registerRichText(editor),
      registerDragonSupport(editor),
    );
  }, [editor]);
}
