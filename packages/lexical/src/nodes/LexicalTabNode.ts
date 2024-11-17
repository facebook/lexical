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

  // Add method to get class name for styling
  getClassName(): string {
    const baseClass = 'PlaygroundEditorTheme__tabNode';
    const formatClassNames = [];

    const underline = this.hasFormat('underline');
    const strikethrough = this.hasFormat('strikethrough');

    if (underline && strikethrough) {
      formatClassNames.push(
        'PlaygroundEditorTheme__textUnderlineStrikethrough',
      );
    } else if (strikethrough) {
      formatClassNames.push('PlaygroundEditorTheme__textStrikethrough');
    } else if (underline) {
      formatClassNames.push('PlaygroundEditorTheme__textUnderline');
    }

    return [baseClass, ...formatClassNames].join(' ');
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = this.getClassName();
    return dom;
  }

  updateDOM(
    prevNode: TabNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const updated = super.updateDOM(prevNode, dom, config);
    if (updated) {
      dom.className = this.getClassName();
    }
    return updated;
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
