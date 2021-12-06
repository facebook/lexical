/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, CommandListenerEditorPriority} from 'outline';

import * as React from 'react';
import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {useCollaborationContext} from '../context/CollaborationContext';
import {useEffect, useState} from 'react';
import {log, isElementNode, getSelection, createEditorStateRef} from 'outline';
import {isListItemNode} from 'outline/ListItemNode';
import {ImageNode, createImageNode} from '../nodes/ImageNode';
import yellowFlowerImage from '../images/image/yellow-flower.jpg';
import useOutlineNestedList from 'outline-react/useOutlineNestedList';
import TablesPlugin from './TablesPlugin';
import {createTableNodeWithDimensions} from 'outline/nodes';
import {createParagraphNode} from 'outline/ParagraphNode';
import TableCellActionMenuPlugin from './TableCellActionMenuPlugin';

const EditorPriority: CommandListenerEditorPriority = 0;

function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

export default function ActionsPlugins({
  isRichText,
}: {
  isRichText: boolean,
}): React$Node {
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const [connected, setConnected] = useState(false);
  const [editor] = useOutlineComposerContext();
  const [indent, outdent] = useOutlineNestedList(editor);
  const {yjsDocMap} = useCollaborationContext();
  const isCollab = yjsDocMap.get('main') !== undefined;

  useEffect(() => {
    const unregisterNodes = editor.registerNodes([ImageNode]);
    const removeCommandListener = editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'readOnly') {
          const readOnly = payload;
          setIsReadyOnly(readOnly);
        } else if (type === 'connected') {
          const isConnected = payload;
          setConnected(isConnected);
        }
        return false;
      },
      EditorPriority,
    );

    return () => {
      unregisterNodes();
      removeCommandListener();
    };
  }, [editor]);

  const handleAddImage = () => {
    editor.update(() => {
      log('handleAddImage');
      const selection = getSelection();
      if (selection !== null) {
        const ref = createEditorStateRef(createUID(), null);
        const imageNode = createImageNode(
          yellowFlowerImage,
          'Yellow flower in tilt shift lens',
          ref,
        );
        selection.insertNodes([imageNode]);
      }
    });
  };

  const handleAddTable = () => {
    editor.update(() => {
      log('handleAddTable');
      const selection = getSelection();
      if (selection === null) {
        return;
      }
      const focusNode = selection.focus.getNode();

      if (focusNode !== null) {
        const topLevelNode = focusNode.getTopLevelElementOrThrow();
        const tableNode = createTableNodeWithDimensions(3, 3);
        topLevelNode.insertAfter(tableNode);
        tableNode.insertAfter(createParagraphNode());
        const firstCell = tableNode
          .getFirstChildOrThrow<ElementNode>()
          .getFirstChildOrThrow<ElementNode>();
        firstCell.select();
      }
    });
  };

  const setAlignment = (alignment: 'left' | 'right' | 'center' | 'justify') => {
    editor.update(() => {
      const selection = getSelection();
      if (selection !== null) {
        const node = selection.anchor.getNode();
        const element = isElementNode(node) ? node : node.getParentOrThrow();
        element.setFormat(alignment);
      }
    });
  };

  const leftAlign = () => {
    setAlignment('left');
  };

  const centerAlign = () => {
    setAlignment('center');
  };

  const rightAlign = () => {
    setAlignment('right');
  };

  const justifyAlign = () => {
    setAlignment('justify');
  };

  const applyOutdent = () => {
    editor.update(() => {
      const selection = getSelection();
      if (selection !== null) {
        const node = selection.anchor.getNode();
        const element = isElementNode(node) ? node : node.getParentOrThrow();
        if (!isListItemNode(element)) {
          if (element.getIndent() !== 0) {
            element.setIndent(element.getIndent() - 1);
          }
        } else {
          outdent();
        }
      }
    });
  };

  const applyIndent = () => {
    editor.update(() => {
      const selection = getSelection();
      if (selection !== null) {
        const node = selection.anchor.getNode();
        const element = isElementNode(node) ? node : node.getParentOrThrow();
        if (!isListItemNode(element)) {
          if (element.getIndent() !== 10) {
            element.setIndent(element.getIndent() + 1);
          }
        } else {
          indent();
        }
      }
    });
  };

  return (
    <>
      <TablesPlugin />
      <TableCellActionMenuPlugin />
      <div className="actions">
        {isRichText && (
          <>
            <button className="action-button outdent" onClick={applyOutdent}>
              <i className="outdent" />
            </button>
            <button className="action-button indent" onClick={applyIndent}>
              <i className="indent" />
            </button>
            <button className="action-button left-align" onClick={leftAlign}>
              <i className="left-align" />
            </button>
            <button
              className="action-button center-align"
              onClick={centerAlign}
            >
              <i className="center-align" />
            </button>
            <button className="action-button right-align" onClick={rightAlign}>
              <i className="right-align" />
            </button>
            <button
              className="action-button justify-align"
              onClick={justifyAlign}
            >
              <i className="justify-align" />
            </button>
            <button
              className="action-button insert-image"
              onClick={handleAddImage}
            >
              <i className="image" />
            </button>
            <button
              className="action-button insert-table"
              onClick={handleAddTable}
            >
              <i className="table" />
            </button>
          </>
        )}
        <button
          className="action-button clear"
          onClick={() => {
            editor.execCommand('clear');
            editor.focus();
          }}
        >
          <i className="clear" />
        </button>
        <button
          className="action-button lock"
          onClick={() => {
            editor.execCommand('readOnly', !isReadOnly);
          }}
        >
          <i className={isReadOnly ? 'unlock' : 'lock'} />
        </button>
        {isCollab && (
          <button
            className="action-button connect"
            onClick={() => {
              editor.execCommand('toggleConnect', !connected);
            }}
          >
            <i className={connected ? 'disconnect' : 'connect'} />
          </button>
        )}
      </div>
    </>
  );
}
