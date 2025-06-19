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
 $getNearestNodeFromDOMNode, $insertNodes,
  $isRootOrShadowRoot,
  CLICK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  LexicalCommand,
  LexicalEditor } from 'lexical';
import {useCallback, useEffect} from 'react';
import * as React from 'react';

import {$createDateTimeNode, $isDateTimeNode, DateTimeNode} from '../../nodes/DateTimeNode/DateTimeNode';
import { doc } from 'prettier';
import ReactDOM from 'react-dom';

const DateTimeComponent = React.lazy(() => import('../../nodes/DateTimeNode/DateTimeComponent'));

type CommandPayload = {
  dateTime: Date | undefined;
};

export const INSERT_DATETIME_COMMAND: LexicalCommand<CommandPayload> =
  createCommand('INSERT_DATETIME_COMMAND');

export default function DateTimePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([DateTimeNode])) {
      throw new Error(
        'DateTimePlugin: DateTimeNode not registered on editor',
      );
    }

    return mergeRegister(
        editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          editor.read(() => {
              const abc = $getNearestNodeFromDOMNode(event.target as Node);
              console.log('abc', abc);
              if ($isDateTimeNode(abc))
              {
                console.log('here')
              // ReactDOM.createPortal(<DateTimeComponent dateTime={new Date()}/>, document.body);
              return ReactDOM.createPortal(
                <p style={{zIndex: 9999, fontSize: 999, color: 'red', top: 100, left: 100, width: 400, height: 300}}>
                  {"asdasd sad asd asd "}
                </p>
              , document.body);
              }
          });
    //   const buttonElem = buttonRef.current;
    //   const eventTarget = event.target;

    //   if (
    //     buttonElem !== null &&
    //     isDOMNode(eventTarget) &&
    //     buttonElem.contains(eventTarget)
    //   ) {
    //     if (!event.shiftKey) {
    //       clearSelection();
    //     }
    //     setSelected(!isSelected);
    //     if (event.detail > 1) {
    //       setModalOpen(true);
    //     }
    //     return true;
    //   }

        return false;
        },
        COMMAND_PRIORITY_LOW,
    ),
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
    ));
  }, [editor]);

  return null;
}
