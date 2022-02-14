/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorConfig,
  EditorThemeClasses,
  LexicalNode,
  NodeKey,
} from 'lexical';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/helpers/elements';
import {TextNode} from 'lexical';

export class CodeHighlightNode extends TextNode {
  __highlightType: ?string;

  constructor(text: string, highlightType?: string, key?: NodeKey): void {
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

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = super.createDOM(config);
    const className = getHighlightThemeClass(
      config.theme,
      this.__highlightType,
    );
    addClassNamesToElement(element, className);
    return element;
  }

  updateDOM<EditorContext>(
    // $FlowFixMe
    prevNode: CodeHighlightNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
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

  // Prevent formatting (bold, underline, etc)
  setFormat(format: number): this {
    return this.getWritable();
  }
}

function getHighlightThemeClass(
  theme: EditorThemeClasses,
  highlightType: ?string,
): ?string {
  return (
    highlightType &&
    theme &&
    theme.codeHighlight &&
    theme.codeHighlight[highlightType]
  );
}

export function $createCodeHighlightNode(
  text: string,
  highlightType?: string,
): CodeHighlightNode {
  return new CodeHighlightNode(text, highlightType);
}

export function $isCodeHighlightNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CodeHighlightNode;
}
