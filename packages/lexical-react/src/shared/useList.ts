/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {registerList} from '@lexical/list';
import {useEffect} from 'react';

export function useList(editor: LexicalEditor): void {
  useEffect(() => {
    return registerList(editor);
  }, [editor]);
}
