/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertNodeIntoLeaf, $wrapNodeInElement} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  LexicalCommand,
} from 'lexical';

import {
  $createDateTimeNode,
  DateTimeNode,
} from '../../nodes/DateTimeNode/DateTimeNode';

type CommandPayload = {
  dateTime: Date;
};

export const INSERT_DATETIME_COMMAND: LexicalCommand<CommandPayload> =
  createCommand('INSERT_DATETIME_COMMAND');

export const DateTimeExtension = defineExtension({
  name: '@lexical/playground/DateTime',
  nodes: [DateTimeNode],
  register: (editor) =>
    editor.registerCommand<CommandPayload>(
      INSERT_DATETIME_COMMAND,
      (payload) => {
        const {dateTime} = payload;
        const dateTimeNode = $createDateTimeNode(dateTime);

        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          dateTimeNode.setFormat(selection.format);
        }
        $insertNodeIntoLeaf(dateTimeNode);
        if ($isRootOrShadowRoot(dateTimeNode.getParent())) {
          $wrapNodeInElement(dateTimeNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
});
