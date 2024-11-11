/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import {TextNode} from 'lexical';

export type SerializedCapitalizationNode = Spread<
  {
    className: string;
  },
  SerializedTextNode
>;

// eslint-disable-next-line no-shadow
export enum Capitalization {
  Titlecase = 'capitalize',
  Uppercase = 'uppercase',
  Lowercase = 'lowercase',
}

export class CapitalizationNode extends TextNode {
  __capitalization: Capitalization;

  static getType(): string {
    return 'capitalization';
  }

  static clone(node: CapitalizationNode): CapitalizationNode {
    return new CapitalizationNode(
      node.__capitalization,
      node.__text,
      node.__key,
    );
  }

  constructor(capitalization: Capitalization, text: string, key?: NodeKey) {
    super(text, key);
    this.__capitalization = capitalization;
  }

  createDOM(_: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.style.textTransform = this.__capitalization;
    dom.textContent = this.__text;

    return dom;
  }

  //   static importJSON(json: SerializedCapitalizationNode): CapitalizationNode {
  //     //todo
  //   }

  //   exportJSON(): SerializedCapitalizationNode {
  //     //todo
  //   }
}

export function $isCapitalizationNode(
  node: LexicalNode | null | undefined,
): node is CapitalizationNode {
  return node instanceof CapitalizationNode;
}

export function $createCapitalizationNode(
  capitalization: Capitalization,
  text: string,
): CapitalizationNode {
  return new CapitalizationNode(capitalization, text);
}
