/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import useOutlineEmojis from './useOutlineEmojis';

export default function EmojisPlugin(): React$Node {
  const [editor] = useOutlineComposerContext();
  useOutlineEmojis(editor);
  return null;
}
