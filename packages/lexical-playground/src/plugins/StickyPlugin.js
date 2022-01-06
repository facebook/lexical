/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import {useEffect} from 'react';
import {StickyNode} from '../nodes/StickyNode';

export default function StickyPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerNodes([StickyNode]);
  }, [editor]);
  return null;
}
