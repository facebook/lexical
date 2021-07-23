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
  width,
  height,
}: {
  altText: string,
  className: ?string,
  imageRef: {current: null | HTMLElement},
  onFocus: () => void,
  onBlur: () => void,
  onKeyDown: (KeyboardEvent) => void,
  src: string,
  width: 'inherit' | number,
  height: 'inherit' | number,
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
      style={{
        width,
        height,
      }}
    />
  );
}

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef,
}: {
  onResizeStart: () => void,
  onResizeEnd: ('inherit' | number, 'inherit' | number) => void,
  imageRef: {current: null | HTMLElement},
}): React.Node {
  const positioningRef = useRef<{
    currentWidth: 'inherit' | number,
    currentHeight: 'inherit' | number,
    startWidth: number,
    startHeight: number,
    startX: number,
    startY: number,
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6,
    isResizing: boolean,
  }>({
    currentWidth: 0,
    currentHeight: 0,
    startWidth: 0,
    startHeight: 0,
    startX: 0,
    startY: 0,
    direction: 0,
    isResizing: false,
  });
  const handlePointerDown = (
    event: PointerEvent,
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  ) => {
    const image = imageRef.current;
    if (image !== null) {
      const {width, height} = image.getBoundingClientRect();
      const positioning = positioningRef.current;
      positioning.startWidth = width;
      positioning.startHeight = height;
      positioning.currentWidth = 'inherit';
      positioning.currentHeight = 'inherit';
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
      // Moving south/north
      if (positioning.direction === 4) {
        const diff = Math.floor(event.clientY - positioning.startY);
        const minHeight = positioning.startHeight / 2;
        const maxHeight = positioning.startHeight;
        let height = positioning.startHeight + diff;
        if (height < minHeight) {
          height = minHeight;
        } else if (height > maxHeight) {
          height = maxHeight;
        }
        image.style.width = `inherit`;
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
        image.style.height = `inherit`;
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
  width,
  height,
}: {
  editor: OutlineEditor,
  src: string,
  altText: string,
  nodeKey: NodeKey,
  width: 'inherit' | number,
  height: 'inherit' | number,
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
          width={width}
          height={height}
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
            onResizeEnd={(nextWidth, nextHeight) => {
              const rootElement = editor.getRootElement();
              if (rootElement !== null) {
                rootElement.style.setProperty('cursor', 'default');
              }
              setIsResizing(false);
              editor.update((view) => {
                const node = view.getNodeByKey(nodeKey);
                if (isImageNode(node)) {
                  node.setWidthAndHeight(nextWidth, nextHeight);
                }
              }, 'ImageNode.resize');
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
  __width: 'inherit' | number;
  __height: 'inherit' | number;

  static deserialize(data: $FlowFixMe): ImageNode {
    return new ImageNode(
      data.__src,
      data.__altText,
      data.__width,
      data.__height,
    );
  }

  constructor(
    src: string,
    altText: string,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey,
  ) {
    super(key);
    this.__type = 'image';
    this.__src = src;
    this.__altText = altText;
    this.__width = 'inherit';
    this.__height = 'inherit';
  }
  getTextContent(): string {
    return this.__altText;
  }
  clone(): ImageNode {
    return new ImageNode(
      this.__src,
      this.__altText,
      this.__width,
      this.__height,
      this.__key,
    );
  }
  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
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
        width={this.__width}
        height={this.__height}
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
