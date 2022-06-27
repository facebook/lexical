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
import {ElementNode} from 'lexical';

export type Modal = ({
  onClose,
  children,
  title,
  closeOnClickOutside,
}: {
  children: JSX.Element | string | (JSX.Element | string)[];
  closeOnClickOutside?: boolean;
  onClose: () => void;
  title: string;
}) => JSX.Element;

export type ExcalidrawElementFragment = {
  isDeleted?: boolean;
};

export type Excalidraw = ({
  onChange,
  initialData,
}: {
  onChange: (els: ReadonlyArray<ExcalidrawElementFragment>) => void;
  initialData: {
    appState: {isLoading: boolean};
    elements: ReadonlyArray<ExcalidrawElementFragment>;
  };
}) => JSX.Element;

export declare class ExcalidrawNode extends ElementNode {
  __data: string;
  __modal: Modal;
  __excalidraw: Excalidraw;
  static getType(): string;
  static clone(node: ExcalidrawNode): ExcalidrawNode;
  constructor(data: string, key?: NodeKey);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(
    prevNode: ExcalidrawNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean;
  static importDOM(): DOMConversionMap | null;
  getData(): string;
  setData(data: string): void;
  insertNewAfter(selection: RangeSelection): null | ElementNode;
  canInsertTextBefore(): false;
  canInsertTextAfter(): boolean;
  canBeEmpty(): false;
  isInline(): true;
}

export function convertAnchorElement(domNode: Node): DOMConversionOutput;
export function $createExcalidrawNode(
  modalComponent: Modal,
  excalidrawComponent: Excalidraw,
): ExcalidrawNode;
export function $isExcalidrawNode(
  node: ExcalidrawNode | LexicalNode | null | undefined,
): node is ExcalidrawNode;
export declare class AutoExcalidrawNode extends ExcalidrawNode {
  static getType(): string;
  static clone(node: AutoExcalidrawNode): AutoExcalidrawNode;
  insertNewAfter(selection: RangeSelection): null | ElementNode;
}

export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void>;

export function ExcalidrawPlugin({
  modal: Modal,
  excalidraw: Excalidraw,
  excalidrawImage: ExcalidrawImage,
}): JSX.Element;
