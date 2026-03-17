/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {COMMAND_PRIORITY_CRITICAL, LexicalCommand} from 'lexical';
import {useEffect, useState} from 'react';

export type LexicalCommandEntry = {index: number} & LexicalCommand<unknown> & {
    payload: unknown;
  };

export type LexicalCommandLog = ReadonlyArray<LexicalCommandEntry>;

export function registerLexicalCommandLogger(
  editor: LexicalEditor,
  setLoggedCommands: (
    v: (oldValue: LexicalCommandLog) => LexicalCommandLog,
  ) => void,
): () => void {
  const unregisterCommandListeners: (() => void)[] = [];
  let index = 0;
  for (const command of editor._commands.keys()) {
    unregisterCommandListeners.push(
      editor.registerCommand(
        command,
        (payload) => {
          index += 1;
          const entry: LexicalCommandEntry = {
            index,
            payload,
            type: command.type ? command.type : 'UNKNOWN',
          };
          setLoggedCommands((state) => [...state.slice(-9), entry]);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }

  return () => unregisterCommandListeners.forEach((unregister) => unregister());
}

export function useLexicalCommandsLog(
  editor: LexicalEditor,
): LexicalCommandLog {
  const [loggedCommands, setLoggedCommands] = useState<LexicalCommandLog>([]);

  useEffect(
    () => registerLexicalCommandLogger(editor, setLoggedCommands),
    [editor],
  );

  return loggedCommands;
}
