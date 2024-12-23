/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMConversionMap, NodeKey} from '../LexicalNode';

import invariant from 'shared/invariant';

import {IS_UNMERGEABLE} from '../LexicalConstants';
import {EditorConfig} from '../LexicalEditor';
import {LexicalNode} from '../LexicalNode';
import {$applyNodeReplacement, getCachedClassNameArray} from '../LexicalUtils';
import {
  SerializedTextNode,
  TextDetailType,
  TextModeType,
  TextNode,
} from './LexicalTextNode';

export type SerializedTabNode = SerializedTextNode;

/** @noInheritDoc */
export class TabNode extends TextNode {
  static getType(): string {
    return 'tab';
  }

  static clone(node: TabNode): TabNode {
    return new TabNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super('\t', key);
    this.__detail = IS_UNMERGEABLE;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    const classNames = getCachedClassNameArray(config.theme, 'tab');

    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }

  static importJSON(serializedTabNode: SerializedTabNode): TabNode {
    return $createTabNode().updateFromJSON(serializedTabNode);
  }

  setTextContent(text: string): this {
    invariant(
      text === '\t' || text === '',
      'TabNode does not support setTextContent',
    );
    return super.setTextContent(text);
  }

  setDetail(detail: TextDetailType | number): this {
    invariant(detail === IS_UNMERGEABLE, 'TabNode does not support setDetail');
    return this;
  }

  setMode(type: TextModeType): this {
    invariant(type !== 'normal', 'TabNode does not support setMode');
    return this;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createTabNode(): TabNode {
  return $applyNodeReplacement(new TabNode());
}

export function $isTabNode(
  node: LexicalNode | null | undefined,
): node is TabNode {
  return node instanceof TabNode;
}
