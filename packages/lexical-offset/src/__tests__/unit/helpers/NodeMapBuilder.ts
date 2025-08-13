/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  type ElementNode,
  type LexicalNode,
  type LineBreakNode,
  type ParagraphNode,
  type RootNode,
  type TextNode,
} from 'lexical';

export class NodeMapBuilder {
  private nodeMap: Map<string, LexicalNode> = new Map();
  private rootNode: RootNode | null = null;
  private paragraphKeyToChildren: Map<string, LexicalNode[]> = new Map();
  private currentParagraph: ParagraphNode | null = null;

  addRootNode(): NodeMapBuilder {
    if (this.rootNode) {
      throw new Error('Root node already exists');
    }
    const key = 'root';
    const rootNode = {
      ...this.createBaseStubNode('root', key),
      __first: null,
    } as RootNode;
    this.nodeMap.set(key, rootNode);
    this.rootNode = rootNode;
    return this;
  }

  addParagraphNode(key?: string): NodeMapBuilder {
    if (!this.rootNode) {
      throw new Error('Root node does not exist');
    }

    const paragraphNode = {
      ...this.createBaseStubNode('paragraph', key),
      __first: null,
    } as ParagraphNode;
    this.nodeMap.set(paragraphNode.__key, paragraphNode);
    if (this.currentParagraph === null) {
      this.rootNode.__first = paragraphNode.__key;
    } else {
      this.currentParagraph.__next = paragraphNode.__key;
    }

    this.currentParagraph = paragraphNode;
    this.paragraphKeyToChildren.set(paragraphNode.__key, []);

    return this;
  }

  addTextNodeOf(length: number, key?: string): NodeMapBuilder {
    const textContent = 'x'.repeat(length);
    return this.addTextNode(textContent, key);
  }

  addTextNode(text: string, key?: string): NodeMapBuilder {
    if (this.currentParagraph === null) {
      throw new Error('No paragraph to add text node to');
    }

    const textNode = {
      ...this.createBaseStubNode('text', key),
      __text: text,
      getTextContentSize: () => text.length,
    } as TextNode;
    this.nodeMap.set(textNode.__key, textNode);
    this.linkNode(textNode);

    return this;
  }

  addLineBreakNode(key?: string): NodeMapBuilder {
    if (this.currentParagraph === null) {
      throw new Error('No paragraph to add line break node to');
    }

    const lineBreakNode = {
      ...this.createBaseStubNode('lineBreak', key),
    } as LineBreakNode;
    this.nodeMap.set(lineBreakNode.__key, lineBreakNode);
    this.linkNode(lineBreakNode);

    return this;
  }

  build(): Map<string, LexicalNode> {
    return this.nodeMap;
  }

  private linkNode(newNode: LexicalNode) {
    if (this.currentParagraph === null) {
      throw new Error('No paragraph to link node to');
    }

    if (this.currentParagraph.__first === null) {
      this.currentParagraph.__first = newNode.__key;
    }

    const childrenOfContainingParagraph = this.paragraphKeyToChildren.get(
      this.currentParagraph.__key,
    );
    if (childrenOfContainingParagraph) {
      const linkTo = childrenOfContainingParagraph.at(-1);
      if (linkTo) {
        linkTo.__next = newNode.__key;
      }

      newNode.getIndexWithinParent = () => childrenOfContainingParagraph.length;
      newNode.getParentOrThrow = <T extends ElementNode>(): T =>
        this.currentParagraph as unknown as T;

      childrenOfContainingParagraph.push(newNode);
    }
  }

  private createBaseStubNode(type: string, key?: string): LexicalNode {
    key = key ?? `autoKey-${this.nodeMap.size + 1}-${type}`;
    const node = {
      __key: key,
      __next: null,
      __type: type,
      getKey: () => key,
    } as LexicalNode;

    node.getNextSibling = <T extends LexicalNode>(): T | null =>
      node.__next ? (this.nodeMap.get(node.__next) as T) : null;

    return node;
  }
}
