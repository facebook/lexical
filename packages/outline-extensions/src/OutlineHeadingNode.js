/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey, EditorThemeClasses} from 'outline';
import type {ParagraphNode} from 'outline-extensions/ParagraphNode';

import {BlockNode} from 'outline';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';

type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeadingNode extends BlockNode {
  __tag: HeadingTagType;

  constructor(tag: HeadingTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
    this.__type = 'heading';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): HeadingNode {
    const header = new HeadingNode(data._tag);
    header.flags = data.flags;
    return header;
  }
  clone(): HeadingNode {
    const clone = new HeadingNode(this.__tag, this.__key);
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }
  getTag(): HeadingTagType {
    return this.__tag;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const tag = this.__tag;
    const element = document.createElement(tag);
    const classNames = editorThemeClasses.heading;
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
    this.insertAfter(newBlock);
    return newBlock;
  }
}

export function createHeadingNode(headingTag: HeadingTagType): HeadingNode {
  return new HeadingNode(headingTag);
}

export function isHeadingNode(node: ?OutlineNode): boolean %checks {
  return node instanceof HeadingNode;
}
