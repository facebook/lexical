/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import * as React from 'react';
import PlaygroundController from '../controllers/PlaygroundController';
import {useController} from 'outline-react/OutlineController';
import {useEffect, useState} from 'react';
import {log, isBlockNode, getSelection} from 'outline';
import {isListItemNode} from 'outline/ListItemNode';
import {ImageNode, createImageNode} from '../nodes/ImageNode';
import {insertNodes} from 'outline/selection';
import yellowFlowerImage from '../images/image/yellow-flower.jpg';
import useOutlineNestedList from 'outline-react/useOutlineNestedList';

export default function ActionsPlugins({
  isRichText,
}: {
  isRichText: boolean,
}): React$Node {
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const [editor, {triggerListeners, addListener}] =
    useController(PlaygroundController);
  const [indent, outdent] = useOutlineNestedList(editor);

  useEffect(() => {
    editor.registerNodeType('image', ImageNode);
    return addListener('readonly', (value: boolean) => {
      setIsReadyOnly(value);
    });
  }, [addListener, editor]);

  const handleAddImage = () => {
    editor.update(() => {
      log('handleAddImage');
      const selection = getSelection();
      if (selection !== null) {
        const imageNode = createImageNode(
          yellowFlowerImage,
          'Yellow flower in tilt shift lens',
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
        const block = isBlockNode(node) ? node : node.getParentOrThrow();
        block.setFormat(alignment);
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
        const block = isBlockNode(node) ? node : node.getParentOrThrow();
        if (!isListItemNode(block)) {
          if (block.getIndent() !== 0) {
            block.setIndent(block.getIndent() - 1);
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
        const block = isBlockNode(node) ? node : node.getParentOrThrow();
        if (!isListItemNode(block)) {
          if (block.getIndent() !== 10) {
            block.setIndent(block.getIndent() + 1);
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
    </div>
  );
}
