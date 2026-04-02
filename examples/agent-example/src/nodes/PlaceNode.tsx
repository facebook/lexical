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

export type SerializedPlaceNode = Spread<
  {
    placeName: string;
  },
  SerializedLexicalNode
>;

function $convertPlaceElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const placeName = domNode.getAttribute('data-lexical-place');
  if (placeName) {
    return {node: $createPlaceNode(placeName)};
  }
  return null;
}

export class PlaceNode extends DecoratorNode<JSX.Element> {
  __placeName: string;

  static getType(): string {
    return 'place';
  }

  static clone(node: PlaceNode): PlaceNode {
    return new PlaceNode(node.__placeName, node.__key);
  }

  constructor(placeName: string, key?: NodeKey) {
    super(key);
    this.__placeName = placeName;
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__placeName = prevNode.__placeName;
  }

  static importJSON(serializedNode: SerializedPlaceNode): PlaceNode {
    return $createPlaceNode(serializedNode.placeName).updateFromJSON(
      serializedNode,
    );
  }

  exportJSON(): SerializedPlaceNode {
    return {
      ...super.exportJSON(),
      placeName: this.__placeName,
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
    element.setAttribute('data-lexical-place', this.__placeName);
    element.textContent = this.__placeName;
    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-place')) {
          return null;
        }
        return {
          conversion: $convertPlaceElement,
          priority: 1,
        };
      },
    };
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return this.__placeName;
  }

  decorate(): JSX.Element {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.__placeName)}`;
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`View ${this.__placeName} on Google Maps`}
        className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 py-0.5 text-emerald-700 no-underline transition-colors hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
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
          <path d="M8 0C5.2 0 3 2.3 3 5.2 3 9.1 8 16 8 16s5-6.9 5-10.8C13 2.3 10.8 0 8 0zm0 7.5a2.2 2.2 0 110-4.4 2.2 2.2 0 010 4.4z" />
        </svg>
        {this.__placeName}
      </a>
    );
  }
}

export const PlaceNodeExtension = defineExtension({
  name: '@lexical/agent-example/place-node',
  nodes: () => [PlaceNode],
});

export function $createPlaceNode(placeName: string): PlaceNode {
  return $applyNodeReplacement(new PlaceNode(placeName));
}

export function $isPlaceNode(
  node: LexicalNode | null | undefined,
): node is PlaceNode {
  return node instanceof PlaceNode;
}
