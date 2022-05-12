/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection} from 'lexical';
import * as React from 'react';

export default function TestSkipSelectionPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const clickHandler = () => {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText('foo');
        }
      },
      {skipRootElementFocus: true},
    );
  };

  return (
    <button className="skip-selection-button" onClick={clickHandler}>
      Type foo
    </button>
  );
}
