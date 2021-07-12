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

import {useRef, useState} from 'react';

function Image({
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
      });
    }
  };

  // TODO: This needs to be made accessible.
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <img
      src={src}
      alt={altText}
      ref={ref}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      onKeyDown={handleKeyDown}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    />
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
      <Image
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
