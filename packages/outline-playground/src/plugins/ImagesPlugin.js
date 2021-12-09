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
import {ImageNode} from '../nodes/ImageNode';

export default function ImagesPlugin(): React$Node {
  const [editor] = useOutlineComposerContext();
  useEffect(() => {
    return editor.registerNodes([ImageNode]);
  }, [editor]);
  return null;
}
