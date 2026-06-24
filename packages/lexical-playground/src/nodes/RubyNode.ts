/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMExportOutput,
  DOMSlot,
  EditorConfig,
  LexicalNode,
  SerializedTextNode,
  Spread,
  StateValueOrUpdater,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {
  $createTextNode,
  $getSelection,
  $getState,
  $isRangeSelection,
  $setState,
  createState,
  StateConfigValue,
  TextNode,
} from 'lexical';

export type SerializedRubyNode = Spread<
  {
    annotation: string;
  },
  SerializedTextNode
>;

const annotationState = /* @__PURE__ */ createState('annotation', {
  parse: v => (typeof v === 'string' ? v : ''),
});

/** @noInheritDoc */
export class RubyNode extends TextNode {
  $config() {
    return this.config('ruby', {
      extends: TextNode,
      stateConfigs: [{flat: true, stateConfig: annotationState}],
    });
  }

  constructor(text: string = '', key?: import('lexical').NodeKey) {
    super(text, key);
    this.__mode = 1; // token
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__mode = 1; // token
  }

  createDOM(config: EditorConfig): HTMLElement {
    const inner = super.createDOM(config);
    inner.dataset.rubyAnnotation = this.getAnnotation();
    addClassNamesToElement(
      inner,
      config.theme.ruby || 'PlaygroundEditorTheme__ruby',
    );
    const wrapper = document.createElement('span');
    wrapper.appendChild(inner);
    return wrapper;
  }

  getDOMSlot(dom: HTMLElement): DOMSlot<HTMLElement> {
    const inner = dom.firstElementChild as HTMLElement | null;
    if (inner) {
      return super.getDOMSlot(dom).withElement(inner);
    }
    return super.getDOMSlot(dom);
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const updated = super.updateDOM(prevNode, dom, config);
    if (prevNode.getAnnotation() !== this.getAnnotation()) {
      const inner = dom.firstElementChild as HTMLElement;
      if (inner) {
        inner.dataset.rubyAnnotation = this.getAnnotation();
      }
    }
    return updated;
  }

  exportDOM(): DOMExportOutput {
    const ruby = document.createElement('ruby');
    ruby.textContent = this.getTextContent();
    const rpOpen = document.createElement('rp');
    rpOpen.textContent = '(';
    ruby.appendChild(rpOpen);
    const rt = document.createElement('rt');
    rt.textContent = this.getAnnotation();
    ruby.appendChild(rt);
    const rpClose = document.createElement('rp');
    rpClose.textContent = ')';
    ruby.appendChild(rpClose);
    return {element: ruby};
  }

  getAnnotation(): StateConfigValue<typeof annotationState> {
    return $getState(this, annotationState);
  }

  setAnnotation(
    valueOrUpdater: StateValueOrUpdater<typeof annotationState>,
  ): this {
    return $setState(this, annotationState, valueOrUpdater);
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
  return new RubyNode(text).setAnnotation(annotation);
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
        text.setFormat(node.getFormat());
        text.setStyle(node.getStyle());
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
