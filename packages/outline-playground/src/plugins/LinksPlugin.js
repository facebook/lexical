/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {useEffect} from 'react';
import {LinkNode} from 'outline/LinkNode';

export default function LinksPlugin(): React$Node {
  const [editor] = useOutlineComposerContext();
  useEffect(() => {
    return editor.registerNodes([LinkNode]);
  }, [editor]);
  return null;
}
