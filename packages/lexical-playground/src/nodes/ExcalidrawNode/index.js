/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorConfig,
  NodeKey,
  LexicalNode,
  LexicalEditor,
  DecoratorMap,
  DecoratorEditor,
} from 'lexical';

import Excalidraw, {ExcalidrawElement} from '@excalidraw/excalidraw';

import * as React from 'react';
import {
  DecoratorNode,
  $log,
  $getNodeByKey,
  createDecoratorEditor,
} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  useCollaborationContext,
  CollaborationPlugin,
} from '@lexical/react/LexicalCollaborationPlugin';
import {Suspense, useCallback, useRef, useState} from 'react';
import RichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import ExcalidrawModal from './ExcalidrawModal';
import ExcalidrawImage from './ExcalidrawImage';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {useSharedHistoryContext} from '../../context/SharedHistoryContext';
import LexicalNestedComposer from '@lexical/react/LexicalNestedComposer';
import useLexicalDecoratorMap from '@lexical/react/useLexicalDecoratorMap';
import MentionsPlugin from '../../plugins/MentionsPlugin';
import EmojisPlugin from '../../plugins/EmojisPlugin';
import HashtagsPlugin from '@lexical/react/LexicalHashtagPlugin';
import KeywordsPlugin from '../../plugins/KeywordsPlugin';
import TablesPlugin from '@lexical/react/LexicalTablePlugin';
import TableCellActionMenuPlugin from '../../plugins/TableActionMenuPlugin';
import LinkPlugin from '@lexical/react/LexicalLinkPlugin';
import stylex from 'stylex';

const styles = stylex.create({
  contentEditable: {
    minHeight: 0,
    border: 0,
    resize: 'none',
    cursor: 'text',
    caretColor: 'rgb(5, 5, 5)',
    display: 'block',
    position: 'relative',
    tabSize: 1,
    outline: 0,
    padding: 10,
    userSelect: 'text',
    fontSize: 12,
    width: 'calc(100% - 20px)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  },
  placeholder: {
    fontSize: 12,
    color: '#888',
    overflow: 'hidden',
    position: 'absolute',
    textOverflow: 'ellipsis',
    top: 10,
    left: 10,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    display: 'inline-block',
    pointerEvents: 'none',
  },
});

function ExcalidrawComponent({
  nodeKey,
  state,
}: {
  nodeKey: NodeKey,
  state: DecoratorMap,
}): React.Node {
  const ref = useRef(null);
  const [hasFocus, setHasFocus] = useState<boolean>(false);
  const [isModalOpen, setModalOpen] = useState<boolean>(true);
  const [elements, setElements] = useState([]);
  const [editor] = useLexicalComposerContext();

  const handleKeyDown = (event) => {
    if ((hasFocus && event.key === 'Backspace') || event.key === 'Delete') {
      editor.update(() => {
        $log('Excalidraw.keyDown');
        const node = $getNodeByKey(nodeKey);
        if ($isExcalidrawNode(node)) {
          node.remove();
          event.stopPropagation();
          event.preventDefault();
        }
      });
    }
  };

  const onImageClick = useCallback(
    (e) => {
      if (e.detail > 1) {
        setModalOpen(true);
      }
    },
    [setModalOpen],
  );

  const onRemove = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node != null && $isExcalidrawNode(node)) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);

  const onFocus = useCallback(() => {
    setHasFocus(true);
  });

  const {historyState} = useSharedHistoryContext();

  return (
    <div>
      {isModalOpen && (
        <ExcalidrawModal
          initialElements={elements}
          isShown={true}
          onHide={() => setModalOpen(false)}
          onSave={(data) => {
            setElements(data);
            setModalOpen(false);
          }}
        />
      )}
      <div onClick={onImageClick} onFocus={onFocus} role="button">
        <ExcalidrawImage className="image" elements={elements} />
      </div>
    </div>
  );
}

export class ExcalidrawNode extends DecoratorNode {
  static getType(): string {
    return 'excalidraw';
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(node.__state, node.__key);
  }

  constructor(state?: DecoratorMap, key?: NodeKey) {
    super(state, key);
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
    return (
      <ExcalidrawComponent
        nodeKey={this.getKey()}
        state={this.__state}
        elements={[]}
      />
    );
  }
}

export function $createExcalidrawNode(): ExcalidrawNode {
  return new ExcalidrawNode();
}

export function $isExcalidrawNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ExcalidrawNode;
}
