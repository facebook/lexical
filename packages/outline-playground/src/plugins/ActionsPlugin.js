/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import PlaygroundEditorContext from '../context/PlaygroundEditorContext';
import {useEditorContext} from 'outline-react/OutlineEditorContext';
import {useCollaborationContext} from '../context/CollaborationContext';
import {useEffect, useState} from 'react';
import {log, isElementNode, getSelection, createEditorStateRef} from 'outline';
import {isListItemNode} from 'outline/ListItemNode';
import {ImageNode, createImageNode} from '../nodes/ImageNode';
import {insertNodes} from 'outline/selection';
import yellowFlowerImage from '../images/image/yellow-flower.jpg';
import useOutlineNestedList from 'outline-react/useOutlineNestedList';

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
  const [editor, {triggerListeners, addListener}] = useEditorContext(
    PlaygroundEditorContext,
  );
  const [indent, outdent] = useOutlineNestedList(editor);
  const {yjsDocMap} = useCollaborationContext();
  const isCollab = yjsDocMap.get('main') !== undefined;

  useEffect(() => {
    const unregisterNodes = editor.registerNodes([ImageNode]);
    const removeReadOnlyListener = addListener('readonly', (value: boolean) => {
      setIsReadyOnly(value);
    });
    const removeConnectedListener = addListener(
      'connected',
      (value: boolean) => {
        setConnected(value);
      },
    );

    return () => {
      unregisterNodes();
      removeReadOnlyListener();
      removeConnectedListener();
    };
  }, [addListener, editor]);

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
        insertNodes(selection, [imageNode]);
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
          <button className="action-button center-align" onClick={centerAlign}>
            <i className="center-align" />
          </button>
          <button className="action-button right-align" onClick={rightAlign}>
            <i className="right-align" />
          </button>
          <button
            className="action-button justify-align"
            onClick={justifyAlign}>
            <i className="justify-align" />
          </button>
          <button
            className="action-button insert-image"
            onClick={handleAddImage}>
            <i className="image" />
          </button>
        </>
      )}
      <button
        className="action-button clear"
        onClick={() => {
          triggerListeners('clear');
          editor.focus();
        }}>
        <i className="clear" />
      </button>
      <button
        className="action-button lock"
        onClick={() => triggerListeners('readonly', !isReadOnly)}>
        <i className={isReadOnly ? 'unlock' : 'lock'} />
      </button>
      {isCollab && (
        <button
          className="action-button connect"
          onClick={() => triggerListeners('connect', !connected)}>
          <i className={connected ? 'disconnect' : 'connect'} />
        </button>
      )}
    </div>
  );
}
