/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DecoratorEditor,
  DecoratorMap,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';

import './StickyNode.css';

import {
  CollaborationPlugin,
  useCollaborationContext,
} from '@lexical/react/LexicalCollaborationPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LexicalNestedComposer from '@lexical/react/LexicalNestedComposer';
import PlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import useLexicalDecoratorMap from '@lexical/react/useLexicalDecoratorMap';
import {
  $getNodeByKey,
  $setSelection,
  createDecoratorEditor,
  DecoratorNode,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

import {createWebsocketProvider} from '../collaboration';
import {useSharedHistoryContext} from '../context/SharedHistoryContext';
import StickyEditorTheme from '../themes/StickyEditorTheme';
import ContentEditable from '../ui/ContentEditable';
import Placeholder from '../ui/Placeholder';

function positionSticky(stickyElem: HTMLElement, positioning): void {
  const style = stickyElem.style;
  const rootElementRect = positioning.rootElementRect;
  const rectLeft = rootElementRect !== null ? rootElementRect.left : 0;
  const rectTop = rootElementRect !== null ? rootElementRect.top : 0;
  style.top = rectTop + positioning.y + 'px';
  style.left = rectLeft + positioning.x + 'px';
}

function StickyComponent({
  x,
  y,
  nodeKey,
  color,
  decoratorStateMap,
}: {
  color: 'pink' | 'yellow',
  decoratorStateMap: DecoratorMap,
  nodeKey: NodeKey,
  x: number,
  y: number,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const stickyContainerRef = useRef<null | HTMLElement>(null);
  const positioningRef = useRef<{
    isDragging: boolean,
    offsetX: number,
    offsetY: number,
    rootElementRect: null | ClientRect,
    x: number,
    y: number,
  }>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    rootElementRect: null,
    x: 0,
    y: 0,
  });
  const {yjsDocMap} = useCollaborationContext();
  const isCollab = yjsDocMap.get('main') !== undefined;
  const [decoratorEditor] = useLexicalDecoratorMap<DecoratorEditor>(
    decoratorStateMap,
    'caption',
    () => createDecoratorEditor(),
  );

  useEffect(() => {
    const position = positioningRef.current;
    position.x = x;
    position.y = y;

    const stickyContainer = stickyContainerRef.current;
    if (stickyContainer !== null) {
      positionSticky(stickyContainer, position);
    }
  }, [x, y]);

  useLayoutEffect(() => {
    const position = positioningRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const {target} = entry;
        position.rootElementRect = target.getBoundingClientRect();
        const stickyContainer = stickyContainerRef.current;
        if (stickyContainer !== null) {
          positionSticky(stickyContainer, position);
        }
      }
    });

    const removeRootListener = editor.registerListener(
      'root',
      (nextRootElem, prevRootElem) => {
        if (prevRootElem !== null) {
          resizeObserver.unobserve(prevRootElem);
        }
        if (nextRootElem !== null) {
          resizeObserver.observe(nextRootElem);
        }
      },
    );

    const handleWindowResize = () => {
      const rootElement = editor.getRootElement();
      const stickyContainer = stickyContainerRef.current;
      if (rootElement !== null && stickyContainer !== null) {
        position.rootElementRect = rootElement.getBoundingClientRect();
        positionSticky(stickyContainer, position);
      }
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      removeRootListener();
    };
  }, [editor]);

  useEffect(() => {
    const stickyContainer = stickyContainerRef.current;
    if (stickyContainer !== null) {
      // Delay adding transition so we don't trigger the
      // transition on load of the sticky.
      setTimeout(() => {
        stickyContainer.style.setProperty(
          'transition',
          'top 0.3s ease 0s, left 0.3s ease 0s',
        );
      }, 500);
    }
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const stickyContainer = stickyContainerRef.current;
    const positioning = positioningRef.current;
    const rootElementRect = positioning.rootElementRect;
    if (
      stickyContainer !== null &&
      positioning.isDragging &&
      rootElementRect !== null
    ) {
      positioning.x = event.pageX - positioning.offsetX - rootElementRect.left;
      positioning.y = event.pageY - positioning.offsetY - rootElementRect.top;
      positionSticky(stickyContainer, positioning);
    }
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const stickyContainer = stickyContainerRef.current;
      const positioning = positioningRef.current;
      if (stickyContainer !== null) {
        positioning.isDragging = false;
        stickyContainer.classList.remove('dragging');
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isStickyNode(node)) {
            node.setPosition(positioning.x, positioning.y);
          }
        });
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    },
    [editor, handlePointerMove, nodeKey],
  );

  const handleDelete = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);

  const handleColorChange = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.toggleColor();
      }
    });
  }, [editor, nodeKey]);

  const {historyState} = useSharedHistoryContext();

  return (
    <div
      ref={stickyContainerRef}
      className={`sticky-note ${color}`}
      onPointerDown={(event) => {
        if (event.button === 2 || event.target !== stickyContainerRef.current) {
          // Right click or click on editor should not work
          return;
        }
        const stickContainer = stickyContainerRef.current;
        const positioning = positioningRef.current;
        if (stickContainer !== null) {
          const {top, left} = stickContainer.getBoundingClientRect();
          positioning.offsetX = event.clientX - left + 30;
          positioning.offsetY = event.clientY - top + 20;
          positioning.isDragging = true;
          stickContainer.classList.add('dragging');
          document.addEventListener('pointermove', handlePointerMove);
          document.addEventListener('pointerup', handlePointerUp);
          event.preventDefault();
        }
      }}>
      <button onClick={handleDelete} className="delete">
        X
      </button>
      <button onClick={handleColorChange} className="color">
        <i className="bucket" />
      </button>
      <LexicalNestedComposer
        initialConfig={{
          decoratorEditor: decoratorEditor,
          theme: StickyEditorTheme,
        }}>
        {isCollab ? (
          <CollaborationPlugin
            id={decoratorEditor.id}
            providerFactory={createWebsocketProvider}
            shouldBootstrap={true}
          />
        ) : (
          <HistoryPlugin externalHistoryState={historyState} />
        )}
        <PlainTextPlugin
          contentEditable={
            <ContentEditable className="StickyNode__contentEditable" />
          }
          placeholder={
            <Placeholder className="StickyNode__placeholder">
              What's up?
            </Placeholder>
          }
        />
      </LexicalNestedComposer>
    </div>
  );
}

export class StickyNode extends DecoratorNode<React$Node> {
  __x: number;
  __y: number;
  __color: 'pink' | 'yellow';

  static getType(): string {
    return 'sticky';
  }

  static clone(node: StickyNode): StickyNode {
    return new StickyNode(
      node.__x,
      node.__y,
      node.__color,
      node.__state,
      node.__key,
    );
  }

  constructor(
    x: number,
    y: number,
    color: 'pink' | 'yellow',
    state?: DecoratorMap,
    key?: NodeKey,
  ) {
    super(state, key);
    this.__x = x;
    this.__y = y;
    this.__color = color;
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  setPosition(x: number, y: number): void {
    const writable = this.getWritable();
    writable.__x = x;
    writable.__y = y;
    $setSelection(null);
  }

  toggleColor(): void {
    const writable = this.getWritable();
    writable.__color = writable.__color === 'pink' ? 'yellow' : 'pink';
  }

  decorate(editor: LexicalEditor): React$Node {
    return createPortal(
      <StickyComponent
        color={this.__color}
        x={this.__x}
        y={this.__y}
        nodeKey={this.getKey()}
        decoratorStateMap={this.__state}
      />,
      document.body,
    );
  }

  isIsolated(): true {
    return true;
  }
}

export function $isStickyNode(node: ?LexicalNode): boolean %checks {
  return node instanceof StickyNode;
}

export function $createStickyNode(
  xOffset: number,
  yOffset: number,
): StickyNode {
  return new StickyNode(xOffset, yOffset, 'yellow');
}
