/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import useList from './shared/useList';

export default function ListPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useList(editor);

  return null;
}
