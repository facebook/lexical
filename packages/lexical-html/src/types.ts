/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMImportNextSymbol,
  DOMTextWrapModeKeys,
  DOMWhiteSpaceCollapseKeys,
} from './constants';
import type {AnyStateConfigPair, ContextRecord} from './ContextRecord';
import type {
  BaseSelection,
  DOMExportOutput,
  ElementDOMSlot,
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

export interface DOMExtensionOutput {
  defaults: ContextRecord;
}

/** @internal @experimental */
export type DOMImportOutput = DOMImportOutputNode | DOMImportOutputContinue;

export interface DOMImportOutputNode {
  node: null | LexicalNode | LexicalNode[];
  childNodes?: NodeListOf<ChildNode> | readonly ChildNode[];
  childContext?: AnyStateConfigPair[];
  $appendChild?: (node: LexicalNode, dom: ChildNode) => void;
  $finalize?: (
    node: null | LexicalNode | LexicalNode[],
  ) => null | LexicalNode | LexicalNode[];
}

export interface DOMImportOutputContinue {
  node: DOMImportNext;
  childContext?: AnyStateConfigPair[];
  nextContext?: AnyStateConfigPair[];
  $appendChild?: never;
  childNodes?: never;
  $finalize?: (
    node: null | LexicalNode | LexicalNode[],
  ) => null | LexicalNode | LexicalNode[];
}

export type DOMImportFunction<T extends Node> = (
  node: T,
  $next: DOMImportNext,
  editor: LexicalEditor,
) => null | undefined | DOMImportOutput;

export interface NodeNameMap extends HTMLElementTagNameMap {
  '*': Node;
  '#text': Text;
  '#document': Document;
  '#comment': Comment;
  '#cdata-section': CDATASection;
}

export type NodeNameToType<T extends string> = T extends keyof NodeNameMap
  ? NodeNameMap[T]
  : Node;

/** @internal @experimental */
export interface DOMConfig {
  overrides: AnyDOMConfigMatch[];
  contextDefaults: AnyStateConfigPair[];
}

/** @internal @experimental */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDOMConfigMatch = DOMConfigMatch<any>;

export type NodeMatch<T extends LexicalNode> =
  | Klass<T>
  | ((node: LexicalNode) => node is T);

/** @internal @experimental */
export interface DOMConfigMatch<T extends LexicalNode> {
  readonly nodes: '*' | readonly NodeMatch<T>[];
  $getDOMSlot?: <N extends ElementNode>(
    node: N,
    $next: () => ElementDOMSlot<HTMLElement>,
    editor: LexicalEditor,
  ) => ElementDOMSlot<HTMLElement>;
  $createDOM?: (
    node: T,
    $next: () => HTMLElement,
    editor: LexicalEditor,
  ) => HTMLElement;
  $updateDOM?: (
    nextNode: T,
    prevNode: T,
    dom: HTMLElement,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $exportDOM?: (
    node: T,
    $next: () => DOMExportOutput,
    editor: LexicalEditor,
  ) => DOMExportOutput;
  $shouldExclude?: (
    node: T,
    selection: null | BaseSelection,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $shouldInclude?: (
    node: T,
    selection: null | BaseSelection,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $extractWithChild?: (
    node: T,
    childNode: LexicalNode,
    selection: null | BaseSelection,
    destination: 'clone' | 'html',
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
}

/** @internal @experimental */
export interface DOMImportConfig {
  overrides: DOMImportConfigMatch[];
  compileLegacyImportNode: (
    editor: LexicalEditor,
  ) => DOMImportExtensionOutput['$importNode'];
}
export interface DOMImportConfigMatch {
  tag: '*' | '#text' | '#cdata-section' | '#comment' | (string & {});
  selector?: string;
  priority?: 0 | 1 | 2 | 3 | 4;
  $import: (
    node: Node,
    $next: DOMImportNext,
    editor: LexicalEditor,
  ) => null | undefined | DOMImportOutput;
}

export interface DOMImportNext {
  (): null | undefined | DOMImportOutput;
  readonly [DOMImportNextSymbol]: true;
}

export interface DOMImportExtensionOutput {
  $importNode: (node: Node) => null | undefined | DOMImportOutput;
  $importNodes: (root: ParentNode | Document) => LexicalNode[];
}

export type DOMWhiteSpaceCollapse = keyof typeof DOMWhiteSpaceCollapseKeys;
export type DOMTextWrapMode = keyof typeof DOMTextWrapModeKeys;
