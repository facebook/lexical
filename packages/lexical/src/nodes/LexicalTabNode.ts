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
import {LexicalNode} from '../LexicalNode';
import {$applyNodeReplacement} from '../LexicalUtils';
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

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    // TabNode __text can be either '\t' or ''. insertText will remove the empty Node
    this.__text = prevNode.__text;
  }

  constructor(key?: NodeKey) {
    super('\t', key);
    this.__detail = IS_UNMERGEABLE;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  static importJSON(serializedTabNode: SerializedTabNode): TabNode {
    const node = $createTabNode();
    node.setFormat(serializedTabNode.format);
    node.setStyle(serializedTabNode.style);
    return node;
  }

  exportJSON(): SerializedTabNode {
    return {
      ...super.exportJSON(),
      type: 'tab',
      version: 1,
    };
  }

  setTextContent(_text: string): this {
    invariant(false, 'TabNode does not support setTextContent');
  }

  setDetail(_detail: TextDetailType | number): this {
    invariant(false, 'TabNode does not support setDetail');
  }

  setMode(_type: TextModeType): this {
    invariant(false, 'TabNode does not support setMode');
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
