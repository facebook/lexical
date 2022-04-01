/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

// $FlowFixMe
import 'katex/dist/katex.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection} from 'lexical';
import {useEffect} from 'react';

import {$createEquationNode, EquationNode} from '../nodes/EquationNode';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function EquationsPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([EquationNode])) {
      throw new Error(
        'ExcalidrawPlugin: ExcalidrawNode not registered on editor',
      );
    }

    return editor.registerCommand(
      'insertEquation',
      (payload) => {
        const {equation, inline} = payload;
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const equationNode = $createEquationNode(equation, inline);
          selection.insertNodes([equationNode]);
        }
        return true;
      },
      EditorPriority,
    );
  }, [editor]);
  return null;
}
