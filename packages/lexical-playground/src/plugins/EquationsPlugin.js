/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalCommand} from 'lexical';

// $FlowFixMe
import 'katex/dist/katex.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from 'lexical';
import {useEffect} from 'react';

import {$createEquationNode, EquationNode} from '../nodes/EquationNode';

export const INSERT_EQUATION_COMMAND: LexicalCommand<{
  equation: string,
  inline: boolean,
}> = createCommand();

export default function EquationsPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([EquationNode])) {
      throw new Error(
        'EquationsPlugins: EquationsNode not registered on editor',
      );
    }

    return editor.registerCommand(
      INSERT_EQUATION_COMMAND,
      (payload) => {
        const {equation, inline} = payload;
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const equationNode = $createEquationNode(equation, inline);
          selection.insertNodes([equationNode]);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);
  return null;
}
