/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  EditorThemeClasses,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {$applyNodeReplacement, ElementNode, TextNode} from 'lexical';

import {$createCodeNode} from './CodeNode';

type SerializedCodeHighlightNode = Spread<
  {
    highlightType: string | null | undefined;
  },
  SerializedTextNode
>;

/** @noInheritDoc */
export class CodeHighlightNode extends TextNode {
  /** @internal */
  __highlightType: string | null | undefined;

  constructor(
    text: string = '',
    highlightType?: string | null | undefined,
    key?: NodeKey,
  ) {
    super(text, key);
    this.__highlightType = highlightType;
  }

  static getType(): string {
    return 'code-highlight';
  }

  static clone(node: CodeHighlightNode): CodeHighlightNode {
    return new CodeHighlightNode(
      node.__text,
      node.__highlightType || undefined,
      node.__key,
    );
  }

  getHighlightType(): string | null | undefined {
    const self = this.getLatest();
    return self.__highlightType;
  }

  setHighlightType(highlightType?: string | null | undefined): this {
    const self = this.getWritable();
    self.__highlightType = highlightType || undefined;
    return self;
  }

  canHaveFormat(): boolean {
    return false;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    const className = getHighlightThemeClass(
      config.theme,
      this.__highlightType,
    );
    addClassNamesToElement(element, className);
    return element;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const update = super.updateDOM(prevNode, dom, config);
    const prevClassName = getHighlightThemeClass(
      config.theme,
      prevNode.__highlightType,
    );
    const nextClassName = getHighlightThemeClass(
      config.theme,
      this.__highlightType,
    );
    if (prevClassName !== nextClassName) {
      if (prevClassName) {
        removeClassNamesFromElement(dom, prevClassName);
      }
      if (nextClassName) {
        addClassNamesToElement(dom, nextClassName);
      }
    }
    return update;
  }

  static importJSON(
    serializedNode: SerializedCodeHighlightNode,
  ): CodeHighlightNode {
    return $createCodeHighlightNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedCodeHighlightNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setHighlightType(serializedNode.highlightType);
  }

  exportJSON(): SerializedCodeHighlightNode {
    return {
      ...super.exportJSON(),
      highlightType: this.getHighlightType(),
    };
  }

  // Prevent formatting (bold, underline, etc)
  setFormat(format: number): this {
    return this;
  }

  isParentRequired(): true {
    return true;
  }

  createParentElementNode(): ElementNode {
    return $createCodeNode();
  }
}

function getHighlightThemeClass(
  theme: EditorThemeClasses,
  highlightType: string | null | undefined,
): string | null | undefined {
  return (
    highlightType &&
    theme &&
    theme.codeHighlight &&
    theme.codeHighlight[highlightType]
  );
}

export function $createCodeHighlightNode(
  text: string = '',
  highlightType?: string | null | undefined,
): CodeHighlightNode {
  return $applyNodeReplacement(new CodeHighlightNode(text, highlightType));
}

export function $isCodeHighlightNode(
  node: LexicalNode | CodeHighlightNode | null | undefined,
): node is CodeHighlightNode {
  return node instanceof CodeHighlightNode;
}
