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
}) {
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
}) {
  const ref = useRef(null);
  const [hasFocus, setHasFocus] = useState(false);

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
      <LazyImage
        className={hasFocus ? 'focused' : null}
        src={src}
        altText={altText}
        imageRef={ref}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        onKeyDown={handleKeyDown}
      />
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
