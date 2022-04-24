/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ExcalidrawElementFragment} from './ExcalidrawModal';
import type {EditorConfig, LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import useLexicalNodeSelection from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import ExcalidrawImage from './ExcalidrawImage';
import ExcalidrawModal from './ExcalidrawModal';

function ExcalidrawComponent({
  nodeKey,
  data,
}: {
  data: string,
  nodeKey: NodeKey,
}): React.Node {
  const [editor] = useLexicalComposerContext();
  const [isModalOpen, setModalOpen] = useState<boolean>(
    data === '[]' && !editor.isReadOnly(),
  );
  const buttonRef = useRef<HTMLElement | null>(null);
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);

  const onDelete = useCallback(
    (payload) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isExcalidrawNode(node)) {
            node.remove();
          }
          setSelected(false);
        });
      }
      return false;
    },
    [editor, isSelected, nodeKey, setSelected],
  );

  // Set editor to readOnly if excalidraw is open to prevent unwanted changes
  useEffect(() => {
    if (isModalOpen) {
      editor.setReadOnly(true);
    }
  }, [isModalOpen, editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const buttonElem = buttonRef.current;
          // $FlowFixMe: this will work
          const eventTarget: Element = event.target;
          if (buttonElem !== null && buttonElem.contains(eventTarget)) {
            if (!event.shiftKey) {
              clearSelection();
            }
            setSelected(!isSelected);
            if (event.detail > 1) {
              setModalOpen(true);
            }
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelection, editor, isSelected, onDelete, setSelected]);

  const deleteNode = useCallback(() => {
    return editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isExcalidrawNode(node)) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);

  const setData = useCallback(
    (newData: $ReadOnlyArray<ExcalidrawElementFragment>) => {
      if (editor.isReadOnly()) {
        return;
      }
      return editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isExcalidrawNode(node)) {
          if (newData.length > 0) {
            node.setData(JSON.stringify(newData));
          } else {
            node.remove();
          }
        }
      });
    },
    [editor, nodeKey],
  );

  const elements = useMemo(() => JSON.parse(data), [data]);

  const onHide = useCallback(() => {
    editor.setReadOnly(false);
    setModalOpen(false);
  }, [editor]);

  return (
    <>
      <ExcalidrawModal
        initialElements={elements}
        isShown={isModalOpen}
        onDelete={deleteNode}
        onHide={onHide}
        onSave={(newData) => {
          editor.setReadOnly(false);
          setData(newData);
          setModalOpen(false);
        }}
      />
      <button
        ref={buttonRef}
        className={`excalidraw-button ${isSelected ? 'selected' : ''}`}>
        <ExcalidrawImage className="image" elements={elements} />
      </button>
    </>
  );
}

export class ExcalidrawNode extends DecoratorNode<React$Node> {
  __data: string;

  static getType(): string {
    return 'excalidraw';
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(node.__data, node.__key);
  }

  constructor(data?: string = '[]', key?: NodeKey) {
    super(key);
    this.__data = data;
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  setData(data: string): void {
    const self = this.getWritable();
    self.__data = data;
  }

  decorate(editor: LexicalEditor): React$Node {
    return <ExcalidrawComponent nodeKey={this.getKey()} data={this.__data} />;
  }
}

export function $createExcalidrawNode(): ExcalidrawNode {
  return new ExcalidrawNode();
}

export function $isExcalidrawNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ExcalidrawNode;
}
