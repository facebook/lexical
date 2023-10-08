/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditor,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import {$applyNodeReplacement, createEditor, DecoratorNode} from 'lexical';
import * as React from 'react';
import {Suspense} from 'react';

const ImageComponent = React.lazy(
  // @ts-ignore
  () => import('./ImageComponent'),
);

export type Position = 'left' | 'right' | 'full' | undefined;

export interface ImagePayload {
  altText: string;
  caption?: LexicalEditor;
  height?: number;
  key?: NodeKey;
  maxWidth?: number;
  showCaption?: boolean;
  src: string;
  width?: number;
  captionsEnabled?: boolean;
  position?: Position;
  inline?: boolean;
}

export interface UpdateImagePayload {
  inline: boolean;
  node?: ImageNode;
  position?: Position;
}

const DEFAULT_MAX_IMAGE_WIDTH = 500;

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const {alt: altText, src, width, height} = domNode;
    const node = $createImageNode({altText, height, src, width});
    return {node};
  }
  return null;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    caption: SerializedEditor;
    height?: number;
    maxWidth?: number;
    showCaption: boolean;
    src: string;
    width?: number;
    position?: Position;
    inline?: boolean;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __maxWidth: number | undefined;
  __showCaption: boolean;
  __caption: LexicalEditor;
  // Captions cannot yet be used within editor cells
  __captionsEnabled: boolean;
  __position: Position;
  __inline: boolean;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__position,
      node.__inline,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__captionsEnabled,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const {
      altText,
      height,
      width,
      maxWidth,
      inline,
      position,
      caption,
      src,
      showCaption,
    } = serializedNode;
    const node = $createImageNode({
      altText,
      height,
      inline,
      maxWidth,
      position,
      showCaption,
      src,
      width,
    });
    const nestedEditor = node.__caption;
    const editorState = nestedEditor.parseEditorState(caption.editorState);
    if (!editorState.isEmpty()) {
      nestedEditor.setEditorState(editorState);
    }
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);
    element.setAttribute('width', this.__width.toString());
    element.setAttribute('height', this.__height.toString());
    if (this.__inline) {
      element.setAttribute(
        'data-lexical-image-inline',
        this.__inline.toString(),
      );
    }
    if (this.__position) {
      element.setAttribute('data-lexical-image-position', this.__position);
    }
    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth?: number,
    position?: Position,
    inline?: boolean,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    captionsEnabled?: boolean,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__position = position;
    this.__inline = inline || false;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__showCaption = showCaption || false;
    this.__caption = caption || createEditor();
    this.__captionsEnabled = captionsEnabled || captionsEnabled === undefined;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      caption: this.__caption.toJSON(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      inline: this.__inline,
      maxWidth: this.__maxWidth,
      position: this.__position,
      showCaption: this.__showCaption,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width,
    };
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  getPosition(): Position {
    return this.__position;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  isInline(): boolean {
    return this.__inline;
  }
  setAttributes({
    inline,
    position,
  }: {
    inline: boolean;
    position?: Position;
  }): void {
    const writable = this.getWritable();
    if (inline !== undefined) {
      writable.__inline = inline;
    }
    if (!inline) {
      position = undefined;
      writable.__maxWidth = DEFAULT_MAX_IMAGE_WIDTH;
    }
    writable.__position = position;
    if (position === 'full') {
      writable.__height = 'inherit';
      writable.__width = 'inherit';
      writable.__maxWidth = undefined;
    }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    let className = `${theme.image}`;
    if (this.__position) {
      className += ` position-${this.__position}`;
    }
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(
    prevNode: ImageNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): false {
    const position = this.__position;
    const inline = this.__inline;
    if (inline !== prevNode.__inline || position !== prevNode.__position) {
      const theme = config.theme;
      let className = `${theme.image}`;
      if (position) {
        className += ` position-${position}`;
      }
      if (className !== undefined) {
        dom.className = className;
      }
    }
    return false;
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
          width={this.__width}
          height={this.__height}
          inline={this.__inline} // is this needed?
          maxWidth={this.__maxWidth}
          nodeKey={this.getKey()}
          showCaption={this.__showCaption}
          caption={this.__caption}
          captionsEnabled={this.__captionsEnabled}
          resizable={this.__position !== 'full'}
          position={this.__position}
        />
      </Suspense>
    );
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = DEFAULT_MAX_IMAGE_WIDTH,
  inline = false,
  position,
  captionsEnabled,
  src,
  width,
  showCaption,
  caption,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      src,
      altText,
      maxWidth,
      position,
      inline,
      width,
      height,
      showCaption,
      caption,
      captionsEnabled,
      key,
    ),
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
