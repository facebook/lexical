/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$wrapNodeInElement, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from 'lexical';
import {useEffect} from 'react';

import {
  $createDateTimeNode,
  DateTimeNode,
} from '../../nodes/DateTimeNode/DateTimeNode';

type CommandPayload = {
  dateTime: Date;
};

export const INSERT_DATETIME_COMMAND: LexicalCommand<CommandPayload> =
  createCommand('INSERT_DATETIME_COMMAND');

export default function DateTimePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([DateTimeNode])) {
      throw new Error('DateTimePlugin: DateTimeNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<CommandPayload>(
        INSERT_DATETIME_COMMAND,
        (payload) => {
          const {dateTime} = payload;
          const dateTimeNode = $createDateTimeNode(dateTime);

          $insertNodes([dateTimeNode]);
          if ($isRootOrShadowRoot(dateTimeNode.getParentOrThrow())) {
            $wrapNodeInElement(dateTimeNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  return null;
}
