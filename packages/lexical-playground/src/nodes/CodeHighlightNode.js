/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig} from 'lexical';

import {LexicalNode, TextNode} from 'lexical';

export class CodeHighlightNode extends TextNode {
  __className: ?string;

  constructor(text: string, className?: string, key?: NodeKey): void {
    super(text, key);
    this.__className = className;
  }

  static getType(): string {
    return 'code-highlight';
  }

  static clone(node: CodeHighlightNode): CodeHighlightNode {
    return new CodeHighlightNode(
      node.__text,
      node.__className || undefined,
      node.__key,
    );
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = super.createDOM(config);
    if (this.__className) {
      element.classList.add(...this.__className.split(' '));
    }
    return element;
  }

  updateDOM<EditorContext>(
    // $FlowFixMe
    prevNode: CodeHighlightNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    const update = super.updateDOM(prevNode, dom, config);
    const prevClassName = prevNode.__className;
    const nextClassName = this.__className;
    if (prevClassName !== nextClassName) {
      prevClassName && dom.classList.remove(...prevClassName.split(' '));
      nextClassName && dom.classList.add(...nextClassName.split(' '));
    }
    return update;
  }

  // Prevent formatting (bold, underline, etc)
  setFormat(format: number): this {
    return this.getWritable();
  }
}

export function $createCodeHighlightNode(
  text: string,
  className?: string,
): CodeHighlightNode {
  return new CodeHighlightNode(text, className);
}

export function $isCodeHighlightNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CodeHighlightNode;
}
