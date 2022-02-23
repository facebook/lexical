/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerEditor} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';
import {StickyNode} from '../nodes/StickyNode';

export default function StickyPlugin(): React$Node {
  const editor = useLexicalComposerEditor();
  useEffect(() => {
    if (!editor.hasNodes([StickyNode])) {
      throw new Error('StickyPlugin: StickyNode not registered on editor');
    }
  }, [editor]);
  return null;
}
