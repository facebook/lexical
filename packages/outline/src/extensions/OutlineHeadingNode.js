/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineNode,
  NodeKey,
  ParsedBlockNode,
  EditorConfig,
} from 'outline';
import type {ParagraphNode} from 'outline/ParagraphNode';

import {BlockNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';

type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export type ParsedHeadingNode = ParsedBlockNode & {
  __tag: HeadingTagType,
};

export class HeadingNode extends BlockNode {
  __tag: HeadingTagType;

  static deserialize(data: $FlowFixMe): HeadingNode {
    return new HeadingNode(data.__tag);
  }

  constructor(tag: HeadingTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
    this.__type = 'heading';
  }
  clone(): HeadingNode {
    return new HeadingNode(this.__tag, this.__key);
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
      if (className !== undefined) {
        element.className = className;
      }
    }
    return element;
  }

  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  insertNewAfter(): ParagraphNode {
    const newBlock = createParagraphNode();
    const direction = this.getDirection();
    newBlock.setDirection(direction);
    this.insertAfter(newBlock);
    return newBlock;
  }

  collapseAtStart(): true {
    const paragraph = createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}

export function createHeadingNode(headingTag: HeadingTagType): HeadingNode {
  return new HeadingNode(headingTag);
}

export function isHeadingNode(node: ?OutlineNode): boolean %checks {
  return node instanceof HeadingNode;
}
