/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorConfig,
  OutlineNode,
  OutlineEditor,
  EditorStateRef,
  NodeKey,
} from 'outline';

import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {DecoratorNode, $getNodeByKey, $setSelection} from 'outline';
import InlineSimpleEditor from '../ui/InlineSimpleEditor';
// $FlowFixMe
import {createPortal} from 'react-dom';
import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {useCollaborationContext} from '../context/CollaborationContext';
import PlainTextPlugin from '../plugins/PlainTextPlugin';
import PlainTextCollabPlugin from '../plugins/PlainTextCollabPlugin';
import useLayoutEffect from 'shared/useLayoutEffect';
import StickyEditorTheme from '../themes/StickyEditorTheme';

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
  editorStateRef,
}: {
  x: number,
  y: number,
  nodeKey: NodeKey,
  color: 'pink' | 'yellow',
  editorStateRef: EditorStateRef,
}): React$Node {
  const [editor] = useOutlineComposerContext();
  const [inlineEditor, setInlineEditor] = useState<null | OutlineEditor>(null);
  const stickyContainerRef = useRef<null | HTMLElement>(null);
  const positioningRef = useRef<{
    x: number,
    y: number,
    offsetX: number,
    offsetY: number,
    isDragging: boolean,
    rootElementRect: null | ClientRect,
  }>({
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    rootElementRect: null,
  });
  const {yjsDocMap} = useCollaborationContext();
  const isCollab = yjsDocMap.get('main') !== undefined;

  useEffect(() => {
    if (!editorStateRef.isEmpty() && inlineEditor !== null) {
      const editorState = editorStateRef.get(inlineEditor);
      if (editorState !== null) {
        inlineEditor.setEditorState(editorState, {
          tag: 'without-history',
        });
      }
    }
  }, [editorStateRef, inlineEditor]);

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

    const removeRootListener = editor.addListener(
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

  const onChange = useCallback(
    (editorState, inlineEditor) => {
      setInlineEditor(inlineEditor);
      if (!editorState.isEmpty()) {
        editorStateRef.set(inlineEditor, editorState);
      }
    },
    [editorStateRef],
  );

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
      <InlineSimpleEditor
        onChange={onChange}
        initialEditorStateRef={editorStateRef}
        theme={StickyEditorTheme}>
        {isCollab ? (
          <PlainTextCollabPlugin
            id={editorStateRef.id}
            placeholder="What's up?"
          />
        ) : (
          <PlainTextPlugin placeholder="What's up?" />
        )}
      </InlineSimpleEditor>
    </div>
  );
}

export class StickyNode extends DecoratorNode {
  __x: number;
  __y: number;
  __color: 'pink' | 'yellow';
  // $FlowFixMe: __ref is never null
  __ref: EditorStateRef;

  static getType(): string {
    return 'sticky';
  }

  static clone(node: StickyNode): StickyNode {
    return new StickyNode(
      node.__x,
      node.__y,
      node.__color,
      node.__ref,
      node.__key,
    );
  }

  constructor(
    x: number,
    y: number,
    color: 'pink' | 'yellow',
    ref: EditorStateRef,
    key?: NodeKey,
  ) {
    super(ref, key);
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

  decorate(editor: OutlineEditor): React$Node {
    return createPortal(
      <StickyComponent
        color={this.__color}
        x={this.__x}
        y={this.__y}
        nodeKey={this.getKey()}
        editorStateRef={this.__ref}
      />,
      document.body,
    );
  }
}

export function $isStickyNode(node: ?OutlineNode): boolean %checks {
  return node instanceof StickyNode;
}

export function $createStickyNode(
  xOffset: number,
  yOffset: number,
  ref: EditorStateRef,
): StickyNode {
  return new StickyNode(xOffset, yOffset, 'yellow', ref);
}
