/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {registerCodeHighlighting} from '@lexical/code';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import withSubscriptions from '@lexical/react/withSubscriptions';
import {useEffect} from 'react';

export default function CodeHighlightPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return withSubscriptions(...registerCodeHighlighting(editor));
  }, [editor]);
  return null;
}
