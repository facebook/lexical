// @flow strict-local

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
