/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import usePlainTextSetup from './shared/usePlainTextSetup';

export default function PlainTextPlugin(): null {
  const [editor] = useLexicalComposerContext();
  usePlainTextSetup(editor);

  return null;
}
