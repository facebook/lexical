/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode, ElementNode, LexicalEditor} from 'lexical';
export type DFSNode = Readonly<{
  depth: number;
  node: LexicalNode;
}>;
declare function addClassNamesToElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
): void;
declare function removeClassNamesFromElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
): void;
declare function $dfs(
  startingNode?: LexicalNode,
  endingNode?: LexicalNode,
): Array<DFSNode>;
declare function $getDepth(node: LexicalNode): number;
declare function $getNearestNodeOfType<T extends LexicalNode>(
  node: LexicalNode,
  klass: T,
): T | null;
export type DOMNodeToLexicalConversion = (element: Node) => LexicalNode;
export type DOMNodeToLexicalConversionMap = Record<
  string,
  DOMNodeToLexicalConversion
>;
declare function $findMatchingParent(
  startingNode: LexicalNode,
  findFn: (node: LexicalNode) => boolean,
): LexicalNode | null;
type Func = () => void;
declare function mergeRegister(...func: Array<Func>): () => void;
declare function $getNearestBlockElementAncestorOrThrow(
  startNode: LexicalNode,
): ElementNode;

declare function registerNestedElementResolver<N extends ElementNode>(
  editor: LexicalEditor,
  targetNode: N,
  cloneNode: (from: N) => N,
  handleOverlap: (from: N, to: N) => void,
): () => void;
