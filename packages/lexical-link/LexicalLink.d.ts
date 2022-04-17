/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  RangeSelection,
  LexicalCommand,
} from 'lexical';

export declare class LinkNode extends ElementNode {
  __url: string;
  static getType(): string;
  static clone(node: LinkNode): LinkNode;
  constructor(url: string, key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM<EditorContext>(
    prevNode: LinkNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean;
  static importDOM(): DOMConversionMap | null;
  getURL(): string;
  setURL(url: string): void;
  insertNewAfter(selection: RangeSelection): null | ElementNode;
  canInsertTextBefore(): false;
  canInsertTextAfter(): boolean;
  canBeEmpty(): false;
  isInline(): true;
}
export function convertAnchorElement(domNode: Node): DOMConversionOutput;
export function $createLinkNode(url: string): LinkNode;
export function $isLinkNode(node: ?LexicalNode): boolean;
export declare class AutoLinkNode extends LinkNode {
  static getType(): string;
  static clone(node: AutoLinkNode): AutoLinkNode;
  insertNewAfter(selection: RangeSelection): null | ElementNode;
}
export function $createAutoLinkNode(url: string): AutoLinkNode;
export function $isAutoLinkNode(node: ?LexicalNode): boolean;

export var TOGGLE_LINK_COMMAND: LexicalCommand<string | null>;
