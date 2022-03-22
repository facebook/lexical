/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DecoratorMap,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNodeByKey, DecoratorNode} from 'lexical';
import * as React from 'react';
import {useCallback, useState} from 'react';

import ExcalidrawImage from './ExcalidrawImage';
import ExcalidrawModal from './ExcalidrawModal';

function ExcalidrawComponent({
  nodeKey,
  state,
}: {
  nodeKey: NodeKey,
  state: DecoratorMap,
}): React.Node {
  const [hasFocus, setHasFocus] = useState<boolean>(false);
  const [isModalOpen, setModalOpen] = useState<boolean>(true);
  const [elements, setElements] = useState([]);
  const [editor] = useLexicalComposerContext();

  const handleKeyDown = (event) => {
    if (
      (hasFocus && !isModalOpen && event.key === 'Backspace') ||
      event.key === 'Delete'
    ) {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isExcalidrawNode(node)) {
          node.remove();
          event.stopPropagation();
          event.preventDefault();
        }
      });
    }
  };

  const deleteNode = () => {
    return editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isExcalidrawNode(node)) {
        node.remove();
      }
    });
  };

  const onImageClick = useCallback(
    (e) => {
      if (e.detail > 1) {
        setModalOpen(true);
      }
    },
    [setModalOpen],
  );

  const onFocus = () => {
    setHasFocus(true);
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <ExcalidrawModal
        initialElements={elements}
        isShown={isModalOpen}
        onDelete={deleteNode}
        onHide={() => setModalOpen(false)}
        onSave={(data) => {
          setElements(data);
          setModalOpen(false);
        }}
      />
      <div onClick={onImageClick} onFocus={onFocus} role="button" tabIndex={0}>
        <ExcalidrawImage className="image" elements={elements} />
      </div>
    </div>
  );
}

export class ExcalidrawNode extends DecoratorNode<React$Node> {
  static getType(): string {
    return 'excalidraw';
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(node.__state, node.__key);
  }

  // View
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
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

  decorate(editor: LexicalEditor): React$Node {
    return <ExcalidrawComponent nodeKey={this.getKey()} state={this.__state} />;
  }
}

export function $createExcalidrawNode(): ExcalidrawNode {
  return new ExcalidrawNode();
}

export function $isExcalidrawNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ExcalidrawNode;
}
