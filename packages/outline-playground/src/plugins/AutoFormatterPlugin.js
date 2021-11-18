/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import PlaygroundController from '../controllers/PlaygroundController';
import {useController} from 'outline-react/OutlineController';
import useOutlineAutoFormatter from 'outline-react/useOutlineAutoFormatter';

export default function AutoFormatterPlugin(): React$Node {
  const [editor] = useController(PlaygroundController);
  useOutlineAutoFormatter(editor);

  return null;
}
