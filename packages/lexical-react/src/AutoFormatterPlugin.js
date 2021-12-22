/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import useLexicalAutoFormatter from 'lexical-react/useLexicalAutoFormatter';

export default function AutoFormatterPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useLexicalAutoFormatter(editor);

  return null;
}
