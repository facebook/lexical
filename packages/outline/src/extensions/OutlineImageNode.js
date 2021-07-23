/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorThemeClasses,
  NodeKey,
  OutlineNode,
  OutlineEditor,
  ParsedNode,
} from 'outline';

import {DecoratorNode} from 'outline';

import * as React from 'react';

import {Suspense, useRef, useState} from 'react';

const imageCache = new Set();

function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.add(src);
        resolve();
      };
    });
  }
}

function LazyImage({
  altText,
  className,
  imageRef,
  onFocus,
  onBlur,
  onKeyDown,
  src,
}: {
  altText: string,
  className: ?string,
  imageRef: {current: null | HTMLElement},
  onFocus: () => void,
  onBlur: () => void,
  onKeyDown: (KeyboardEvent) => void,
  src: string,
}): React.Node {
  useSuspenseImage(src);
  // TODO: This needs to be made accessible.
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <img
      className={className}
      src={src}
      alt={altText}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      ref={imageRef}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    />
  );
}

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef,
}: {
  onResizeStart: () => void,
  onResizeEnd: (number, number) => void,
  imageRef: {current: null | HTMLElement},
}): React.Node {
  const positioningRef = useRef({
    currentWidth: 0,
    currentHeight: 0,
    startWidth: 0,
    startHeight: 0,
    startX: 0,
    startY: 0,
    direction: 0,
    isResizing: false,
  });
  const handlePointerDown = (event: PointerEvent, direction: number) => {
    const image = imageRef.current;
    if (image !== null) {
      const rect = image.getBoundingClientRect();
      const positioning = positioningRef.current;
      positioning.startWidth = rect.width;
      positioning.startHeight = rect.height;
      positioning.startX = event.clientX;
      positioning.startY = event.clientY;
      positioning.isResizing = true;
      positioning.direction = direction;
      onResizeStart();
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }
  };
  const handlePointerMove = (event: PointerEvent) => {
    const image = imageRef.current;
    const positioning = positioningRef.current;
    if (image !== null && positioning.isResizing) {
      if (positioning.currentWidth === 0 || positioning.currentHeight === 0) {
        image.style.width = 'inherit';
        image.style.height = 'inherit';
      }
      // Moving south/north
      if (positioning.direction === 4) {
        const diff = Math.floor(event.clientY - positioning.startY);
        const minHeight = positioning.minHeight / 2;
        let height = positioning.startHeight + diff;
        if (height < minHeight) {
          height = minHeight;
        }
        image.style.height = `${height}px`;
        positioning.currentHeight = height;
      } else {
        const diff = Math.floor(event.clientX - positioning.startX);
        const minWidth = positioning.startWidth / 2;
        let width = positioning.startWidth + diff;
        if (width < minWidth) {
          width = minWidth;
        }
        image.style.width = `${width}px`;
        positioning.currentWidth = width;
      }
    }
  };
  const handlePointerUp = (event: PointerEvent) => {
    const image = imageRef.current;
    const positioning = positioningRef.current;
    if (image !== null && positioning.isResizing) {
      const width = positioning.currentWidth;
      const height = positioning.currentHeight;
      positioning.startWidth = 0;
      positioning.startHeight = 0;
      positioning.startX = 0;
      positioning.startY = 0;
      positioning.currentWidth = 0;
      positioning.currentHeight = 0;
      positioning.isResizing = false;
      onResizeEnd(width, height);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }
  };
  return (
    <>
      <div
        className="image-resizer-s"
        onPointerDown={(event) => {
          handlePointerDown(event, 4);
        }}
      />
      <div
        className="image-resizer-e"
        onPointerDown={(event) => {
          handlePointerDown(event, 2);
        }}
      />
      <div
        className="image-resizer-se"
        onPointerDown={(event) => {
          handlePointerDown(event, 3);
        }}
      />
    </>
  );
}

function ImageComponent({
  editor,
  src,
  altText,
  nodeKey,
}: {
  editor: OutlineEditor,
  src: string,
  altText: string,
  nodeKey: NodeKey,
}): React.Node {
  const ref = useRef(null);
  const [hasFocus, setHasFocus] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleKeyDown = (event) => {
    if ((hasFocus && event.key === 'Backspace') || event.key === 'Delete') {
      editor.update((view) => {
        const node = view.getNodeByKey(nodeKey);
        if (node !== null) {
          node.remove();
        }
      }, 'Image.keyDown');
    }
  };

  return (
    <Suspense fallback={null}>
      <>
        <LazyImage
          className={hasFocus || isResizing ? 'focused' : null}
          src={src}
          altText={altText}
          imageRef={ref}
          onFocus={() => setHasFocus(true)}
          onBlur={() => setHasFocus(false)}
          onKeyDown={handleKeyDown}
        />
        {(hasFocus || isResizing) && (
          <ImageResizer
            imageRef={ref}
            onResizeStart={() => {
              const rootElement = editor.getRootElement();
              if (rootElement !== null) {
                rootElement.style.setProperty(
                  'cursor',
                  'nwse-resize',
                  'important',
                );
              }
              setIsResizing(true);
            }}
            onResizeEnd={(width) => {
              const rootElement = editor.getRootElement();
              if (rootElement !== null) {
                rootElement.style.setProperty('cursor', 'default');
              }
              setIsResizing(false);
            }}
          />
        )}
      </>
    </Suspense>
  );
}

export type ParsedImageNode = {
  ...ParsedNode,
  __src: string,
  __altText: string,
};

export class ImageNode extends DecoratorNode {
  __src: string;
  __altText: string;

  static deserialize(data: $FlowFixMe): ImageNode {
    return new ImageNode(data.__src, data.__altText);
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__type = 'image';
    this.__src = src;
    this.__altText = altText;
  }
  getTextContent(): string {
    return this.__altText;
  }
  clone(): ImageNode {
    return new ImageNode(this.__src, this.__altText, this.__key);
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const span = document.createElement('span');
    const className = editorThemeClasses.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }
  updateDOM(): false {
    return false;
  }
  decorate(editor: OutlineEditor): React.Node {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        editor={editor}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function createImageNode(src: string, altText: string): ImageNode {
  return new ImageNode(src, altText);
}

export function isImageNode(node: ?OutlineNode): boolean %checks {
  return node instanceof ImageNode;
}
