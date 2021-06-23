/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';

import * as React from 'react';
import useTypeahead from './useTypeahead';

type Props = $ReadOnly<{
  editor: OutlineEditor,
}>;

export function Typeahead({editor}: Props): React.Node {
  useTypeahead(editor);

  return null;
}
