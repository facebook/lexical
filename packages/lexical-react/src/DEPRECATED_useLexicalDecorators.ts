/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {useDecorators} from './shared/useDecorators';

export function useLexicalDecorators(
  editor: LexicalEditor,
): Array<JSX.Element> {
  return useDecorators(editor);
}
