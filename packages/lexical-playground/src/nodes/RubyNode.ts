/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from 'lexical';

export type SerializedRubyNode = Spread<
  {
    annotation: string;
  },
  SerializedTextNode
>;

/** @noInheritDoc */
export class RubyNode extends TextNode {
  /** @internal */
  __annotation: string;

  static getType(): string {
    return 'ruby';
  }

  static clone(node: RubyNode): RubyNode {
    return new RubyNode(node.__text, node.__annotation, node.__key);
  }

  constructor(text: string, annotation: string, key?: NodeKey) {
    super(text, key);
    this.__annotation = annotation;
    this.__mode = 1; // token
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__annotation = prevNode.__annotation;
    this.__mode = 1; // token
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.dataset.rubyAnnotation = this.__annotation;
    addClassNamesToElement(
      dom,
      config.theme.ruby || 'PlaygroundEditorTheme__ruby',
    );
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const updated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__annotation !== this.__annotation) {
      dom.dataset.rubyAnnotation = this.__annotation;
    }
    return updated;
  }

  exportDOM(): DOMExportOutput {
    const ruby = document.createElement('ruby');
    ruby.textContent = this.getTextContent();
    const rt = document.createElement('rt');
    rt.textContent = this.__annotation;
    ruby.appendChild(rt);
    return {element: ruby};
  }

  static importJSON(serializedNode: SerializedRubyNode): RubyNode {
    return $createRubyNode(
      serializedNode.text,
      serializedNode.annotation,
    ).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedRubyNode>): this {
    return super
      .updateFromJSON(serializedNode)
      .setAnnotation(serializedNode.annotation);
  }

  exportJSON(): SerializedRubyNode {
    return {
      ...super.exportJSON(),
      annotation: this.getAnnotation(),
    };
  }

  getAnnotation(): string {
    return this.getLatest().__annotation;
  }

  setAnnotation(annotation: string): this {
    const writable = this.getWritable();
    writable.__annotation = annotation;
    return writable;
  }

  isInline(): true {
    return true;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }
}

export function $createRubyNode(text: string, annotation: string): RubyNode {
  return $applyNodeReplacement(new RubyNode(text, annotation));
}

export function $isRubyNode(
  node: LexicalNode | null | undefined,
): node is RubyNode {
  return node instanceof RubyNode;
}

export function $toggleRuby(annotation: string | null): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }

  if (annotation === null) {
    const nodes = selection.getNodes();
    for (const node of nodes) {
      if ($isRubyNode(node)) {
        const text = $createTextNode(node.getTextContent());
        node.replace(text);
      }
    }
    return;
  }

  if (selection.isCollapsed()) {
    return;
  }

  const text = selection.getTextContent();
  const rubyNode = $createRubyNode(text, annotation);
  selection.insertNodes([rubyNode]);
}
