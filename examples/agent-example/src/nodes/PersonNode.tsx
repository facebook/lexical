/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import type {JSX} from 'react';

import {
  $applyNodeReplacement,
  DecoratorNode,
  defineExtension,
  DOMExportOutput,
} from 'lexical';

export type SerializedPersonNode = Spread<
  {
    personName: string;
  },
  SerializedLexicalNode
>;

function $convertPersonElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const personName = domNode.getAttribute('data-lexical-person');
  if (personName) {
    return {node: $createPersonNode(personName)};
  }
  return null;
}

export class PersonNode extends DecoratorNode<JSX.Element> {
  __personName: string;

  static getType(): string {
    return 'person';
  }

  static clone(node: PersonNode): PersonNode {
    return new PersonNode(node.__personName, node.__key);
  }

  constructor(personName: string, key?: NodeKey) {
    super(key);
    this.__personName = personName;
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__personName = prevNode.__personName;
  }

  static importJSON(serializedNode: SerializedPersonNode): PersonNode {
    return $createPersonNode(serializedNode.personName).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedPersonNode {
    return {
      ...super.exportJSON(),
      personName: this.__personName,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'inline';
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-person', this.__personName);
    element.textContent = this.__personName;
    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-person')) {
          return null;
        }
        return {
          conversion: $convertPersonElement,
          priority: 1,
        };
      },
    };
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return this.__personName;
  }

  decorate(): JSX.Element {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(this.__personName)}`;
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Search for ${this.__personName}`}
        className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 text-blue-700 no-underline transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        style={{
          borderBottom: '1px dashed currentColor',
          cursor: 'pointer',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        }}>
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          width="12"
          height="12"
          style={{flexShrink: 0, opacity: 0.7}}>
          <path d="M8 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 8c-4 0-6 2-6 3.5V13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5C14 10 12 8 8 8z" />
        </svg>
        {this.__personName}
      </a>
    );
  }
}

export const PersonNodeExtension = defineExtension({
  name: '@lexical/agent-example/person-node',
  nodes: () => [PersonNode],
});

export function $createPersonNode(personName: string): PersonNode {
  return $applyNodeReplacement(new PersonNode(personName));
}

export function $isPersonNode(
  node: LexicalNode | null | undefined,
): node is PersonNode {
  return node instanceof PersonNode;
}
