/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import './StickyNode.css';

import {
  CollaborationPlugin,
  useCollaborationContext,
} from '@lexical/react/LexicalCollaborationPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LexicalNestedComposer from '@lexical/react/LexicalNestedComposer';
import PlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import {
  $getNodeByKey,
  $setSelection,
  createEditor,
  DecoratorNode,
} from 'lexical';
import * as React from 'react';
import {useEffect, useRef} from 'react';
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
  caption,
}: {
  caption: LexicalEditor;
  color: 'pink' | 'yellow';
  nodeKey: NodeKey;
  x: number;
  y: number;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const stickyContainerRef = useRef<null | HTMLDivElement>(null);
  const positioningRef = useRef<{
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
    rootElementRect: null | ClientRect;
    x: number;
    y: number;
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

    const removeRootListener = editor.registerRootListener(
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

  const handlePointerMove = (event: PointerEvent) => {
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
  };

  const handlePointerUp = (event: PointerEvent) => {
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
  };

  const handleDelete = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.remove();
      }
    });
  };

  const handleColorChange = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.toggleColor();
      }
    });
  };

  const {historyState} = useSharedHistoryContext();

  return (
    <div ref={stickyContainerRef} className="sticky-note-container">
      <div
        className={`sticky-note ${color}`}
        onPointerDown={(event) => {
          const stickyContainer = stickyContainerRef.current;
          if (
            stickyContainer == null ||
            event.button === 2 ||
            event.target !== stickyContainer.firstChild
          ) {
            // Right click or click on editor should not work
            return;
          }
          const stickContainer = stickyContainer;
          const positioning = positioningRef.current;
          if (stickContainer !== null) {
            const {top, left} = stickContainer.getBoundingClientRect();
            positioning.offsetX = event.clientX - left;
            positioning.offsetY = event.clientY - top;
            positioning.isDragging = true;
            stickContainer.classList.add('dragging');
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            event.preventDefault();
          }
        }}>
        <button
          onClick={handleDelete}
          className="delete"
          aria-label="Delete sticky note"
          title="Delete">
          X
        </button>
        <button
          onClick={handleColorChange}
          className="color"
          aria-label="Change sticky note color"
          title="Color">
          <i className="bucket" />
        </button>
        <LexicalNestedComposer
          initialEditor={caption}
          initialTheme={StickyEditorTheme}>
          {isCollab ? (
            <CollaborationPlugin
              id={caption.getKey()}
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
            initialEditorState={null}
          />
        </LexicalNestedComposer>
      </div>
    </div>
  );
}

export class StickyNode extends DecoratorNode<JSX.Element> {
  __x: number;
  __y: number;
  __color: 'pink' | 'yellow';
  __caption: LexicalEditor;

  static getType(): string {
    return 'sticky';
  }

  static clone(node: StickyNode): StickyNode {
    return new StickyNode(
      node.__x,
      node.__y,
      node.__color,
      node.__caption,
      node.__key,
    );
  }

  constructor(
    x: number,
    y: number,
    color: 'pink' | 'yellow',
    caption?: LexicalEditor,
    key?: NodeKey,
  ) {
    super(key);
    this.__x = x;
    this.__y = y;
    this.__caption = caption || createEditor();
    this.__color = color;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  setPosition(x: number, y: number): void {
    const writable = this.getWritable<StickyNode>();
    writable.__x = x;
    writable.__y = y;
    $setSelection(null);
  }

  toggleColor(): void {
    const writable = this.getWritable<StickyNode>();
    writable.__color = writable.__color === 'pink' ? 'yellow' : 'pink';
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return createPortal(
      <StickyComponent
        color={this.__color}
        x={this.__x}
        y={this.__y}
        nodeKey={this.getKey()}
        caption={this.__caption}
      />,
      document.body,
    );
  }

  isIsolated(): true {
    return true;
  }
}

export function $isStickyNode(
  node: LexicalNode | null | undefined,
): node is StickyNode {
  return node instanceof StickyNode;
}

export function $createStickyNode(
  xOffset: number,
  yOffset: number,
): StickyNode {
  return new StickyNode(xOffset, yOffset, 'yellow');
}
