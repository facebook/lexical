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

  const typeHandler = () => {
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

  const focusHandler = () => {
    editor.focus();
  };

  return (
    <>
      <button className="skip-selection-type-button" onClick={typeHandler}>
        Type foo
      </button>
      <button className="skip-selection-focus-button" onClick={focusHandler}>
        Focus
      </button>
    </>
  );
}
