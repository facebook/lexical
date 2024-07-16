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
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import {DecoratorNode} from 'lexical';
import * as React from 'react';
import {Suspense} from 'react';

type Dimension = number | 'inherit';

const ExcalidrawComponent = React.lazy(() => import('./ExcalidrawComponent'));

export type SerializedExcalidrawNode = Spread<
  {
    data: string;
    width: Dimension;
    height: Dimension;
  },
  SerializedLexicalNode
>;

function $convertExcalidrawElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const excalidrawData = domNode.getAttribute('data-lexical-excalidraw-json');
  const styleAttributes = window.getComputedStyle(domNode);
  const heightStr = styleAttributes.getPropertyValue('height');
  const widthStr = styleAttributes.getPropertyValue('width');
  const height =
    !heightStr || heightStr === 'inherit' ? 'inherit' : parseInt(heightStr, 10);
  const width =
    !widthStr || widthStr === 'inherit' ? 'inherit' : parseInt(widthStr, 10);

  if (excalidrawData) {
    const node = $createExcalidrawNode();
    node.__data = excalidrawData;
    node.__height = height;
    node.__width = width;
    return {
      node,
    };
  }
  return null;
}

export class ExcalidrawNode extends DecoratorNode<JSX.Element> {
  __data: string;
  __width: Dimension;
  __height: Dimension;

  static getType(): string {
    return 'excalidraw';
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(
      node.__data,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(
      serializedNode.data,
      serializedNode.width,
      serializedNode.height,
    );
  }

  exportJSON(): SerializedExcalidrawNode {
    return {
      data: this.__data,
      height: this.__height,
      type: 'excalidraw',
      version: 1,
      width: this.__width,
    };
  }

  constructor(
    data = '[]',
    width: Dimension = 'inherit',
    height: Dimension = 'inherit',
    key?: NodeKey,
  ) {
    super(key);
    this.__data = data;
    this.__width = width;
    this.__height = height;
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;

    span.style.width =
      this.__width === 'inherit' ? 'inherit' : `${this.__width}px`;
    span.style.height =
      this.__height === 'inherit' ? 'inherit' : `${this.__height}px`;

    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  static importDOM(): DOMConversionMap<HTMLSpanElement> | null {
    return {
      span: (domNode: HTMLSpanElement) => {
        if (!domNode.hasAttribute('data-lexical-excalidraw-json')) {
          return null;
        }
        return {
          conversion: $convertExcalidrawElement,
          priority: 1,
        };
      },
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('span');

    element.style.display = 'inline-block';

    const content = editor.getElementByKey(this.getKey());
    if (content !== null) {
      const svg = content.querySelector('svg');
      if (svg !== null) {
        element.innerHTML = svg.outerHTML;
      }
    }

    element.style.width =
      this.__width === 'inherit' ? 'inherit' : `${this.__width}px`;
    element.style.height =
      this.__height === 'inherit' ? 'inherit' : `${this.__height}px`;

    element.setAttribute('data-lexical-excalidraw-json', this.__data);
    return {element};
  }

  setData(data: string): void {
    const self = this.getWritable();
    self.__data = data;
  }

  setWidth(width: Dimension): void {
    const self = this.getWritable();
    self.__width = width;
  }

  setHeight(height: Dimension): void {
    const self = this.getWritable();
    self.__height = height;
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ExcalidrawComponent nodeKey={this.getKey()} data={this.__data} />
      </Suspense>
    );
  }
}

export function $createExcalidrawNode(): ExcalidrawNode {
  return new ExcalidrawNode();
}

export function $isExcalidrawNode(
  node: LexicalNode | null,
): node is ExcalidrawNode {
  return node instanceof ExcalidrawNode;
}
