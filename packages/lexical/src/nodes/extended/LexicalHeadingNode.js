/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  ParagraphNode,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$createParagraphNode, ElementNode} from 'lexical';

export type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeadingNode extends ElementNode {
  __tag: HeadingTagType;

  static getType(): string {
    return 'heading';
  }

  static clone(node: HeadingNode): HeadingNode {
    return new HeadingNode(node.__tag, node.__key);
  }

  constructor(tag: HeadingTagType, key?: NodeKey): void {
    super(key);
    this.__tag = tag;
  }

  getTag(): HeadingTagType {
    return this.__tag;
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const tag = this.__tag;
    const element = document.createElement(tag);
    const theme = config.theme;
    const classNames = theme.heading;
    if (classNames !== undefined) {
      // $FlowFixMe: intentional cast
      const className = classNames[tag];
      addClassNamesToElement(element, className);
    }
    return element;
  }

  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean {
    return false;
  }

  static convertDOM(): DOMConversionMap | null {
    return {
      h1: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h2: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h3: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h4: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
      h5: (node: Node) => ({
        conversion: convertHeadingElement,
        priority: 0,
      }),
    };
  }

  // Mutation

  insertNewAfter(): ParagraphNode {
    const newElement = $createParagraphNode();
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement);
    return newElement;
  }

  collapseAtStart(): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}

function convertHeadingElement(domNode: Node): DOMConversionOutput {
  const nodeName = domNode.nodeName.toLowerCase();
  let node = null;
  if (
    nodeName === 'h1' ||
    nodeName === 'h2' ||
    nodeName === 'h3' ||
    nodeName === 'h4' ||
    nodeName === 'h5'
  ) {
    node = $createHeadingNode(nodeName);
  }
  return {node};
}

export function $createHeadingNode(headingTag: HeadingTagType): HeadingNode {
  return new HeadingNode(headingTag);
}

export function $isHeadingNode(node: ?LexicalNode): boolean %checks {
  return node instanceof HeadingNode;
}
