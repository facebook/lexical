/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import 'katex/dist/katex.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$wrapNodeInElement} from '@lexical/utils';
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  LexicalEditor,
} from 'lexical';
import {useCallback, useEffect} from 'react';
import * as React from 'react';

import {
  $createInsertVariableNode,
  InsertVariableNode,
} from '../../nodes/InsertVariableNode';
import InsertVariableAlterer from '../../ui/InsertVariableAlterer';

type CommandPayload = {
  equation: string;
};

export const INSERT_VARIABLE_COMMAND: LexicalCommand<CommandPayload> =
  createCommand('INSERT_VARIABLE_COMMAND');

export function InsertVariableDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const onEquationConfirm = useCallback(
    (equation: string) => {
      activeEditor.dispatchCommand(INSERT_VARIABLE_COMMAND, {equation});
      onClose();
    },
    [activeEditor, onClose],
  );

  return <InsertVariableAlterer onConfirm={onEquationConfirm} />;
}

export default function InsertVariablePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([InsertVariableNode])) {
      throw new Error(
        'EquationsPlugins: EquationsNode not registered on editor',
      );
    }

    return editor.registerCommand<CommandPayload>(
      INSERT_VARIABLE_COMMAND,
      (payload) => {
        const {equation} = payload;
        const insertVariableNode = $createInsertVariableNode(equation);

        $insertNodes([insertVariableNode]);
        if ($isRootOrShadowRoot(insertVariableNode.getParentOrThrow())) {
          $wrapNodeInElement(
            insertVariableNode,
            $createParagraphNode,
          ).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
