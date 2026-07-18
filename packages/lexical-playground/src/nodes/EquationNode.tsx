/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import katex from 'katex';
import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import * as React from 'react';

const EquationComponent = React.lazy(() => import('./EquationComponent'));

export type SerializedEquationNode = Spread<
  {
    equation: string;
    inline: boolean;
  },
  SerializedLexicalNode
>;

export class EquationNode extends DecoratorNode<JSX.Element> {
  __equation: string;
  __inline: boolean;

  $config() {
    return this.config('equation', {extends: DecoratorNode});
  }

  constructor(equation: string = '', inline?: boolean, key?: NodeKey) {
    super(key);
    this.__equation = equation;
    this.__inline = inline ?? false;
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__equation = prevNode.__equation;
    this.__inline = prevNode.__inline;
  }

  static importJSON(serializedNode: SerializedEquationNode): EquationNode {
    return $createEquationNode(
      serializedNode.equation,
      serializedNode.inline,
    ).updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedEquationNode {
    return {
      ...super.exportJSON(),
      equation: this.getEquation(),
      inline: this.isInline(),
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement(this.__inline ? 'span' : 'div');
    // EquationNodes should implement `user-action:none` in their CSS to avoid issues with deletion on Android.
    element.className = 'editor-equation';
    element.setAttribute('role', 'math');
    element.setAttribute('aria-label', `Equation: ${this.getEquation()}`);
    return element;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement(this.__inline ? 'span' : 'div');
    // Encode the equation as base64 to avoid issues with special characters
    const equation = btoa(this.__equation);
    element.setAttribute('data-lexical-equation', equation);
    element.setAttribute('data-lexical-inline', `${this.__inline}`);
    katex.render(this.__equation, element, {
      displayMode: !this.__inline, // true === block display //
      errorColor: '#cc0000',
      output: 'html',
      strict: 'warn',
      throwOnError: false,
      trust: false,
    });
    element.setAttribute('role', 'math');
    element.setAttribute('aria-label', `Equation: ${this.__equation}`);
    return {element};
  }

  updateDOM(prevNode: this, dom: HTMLElement): boolean {
    // If the inline property changes, replace the element
    if (this.__inline !== prevNode.__inline) {
      return true;
    }
    if (this.__equation !== prevNode.__equation) {
      dom.setAttribute('aria-label', `Equation: ${this.getEquation()}`);
    }
    return false;
  }

  getTextContent(): string {
    return this.getEquation();
  }

  isInline(): boolean {
    return this.getLatest().__inline;
  }

  getEquation(): string {
    return this.getLatest().__equation;
  }

  setEquation(equation: string): this {
    const writable = this.getWritable();
    writable.__equation = equation;
    return writable;
  }

  decorate(): JSX.Element {
    return (
      <EquationComponent
        equation={this.__equation}
        inline={this.__inline}
        nodeKey={this.__key}
      />
    );
  }
}

export function $createEquationNode(
  equation = '',
  inline = false,
): EquationNode {
  const equationNode = new EquationNode(equation, inline);
  return $applyNodeReplacement(equationNode);
}

export function $isEquationNode(
  node: LexicalNode | null | undefined,
): node is EquationNode {
  return node instanceof EquationNode;
}
