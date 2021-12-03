/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useOutlineComposerContext} from '../../../outline-react/src/composer/OutlineComposerContext';
import {useEditorContext} from 'outline-react/OutlineEditorContext';
import useOutlineAutoFormatter from 'outline-react/useOutlineAutoFormatter';

export default function AutoFormatterPlugin(): React$Node {
  const [editor] = useOutlineComposerContext();
  useOutlineAutoFormatter(editor);

  return null;
}
