/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LexicalEditor} from 'lexical';

export interface DevToolsTree {
  [key: string]: DevToolsNode;
}

export interface DevToolsNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x: string]: any;
  __text?: string;
  __type: string;
  children: Array<DevToolsNode>;
  deHighlightDOMNode: NodeHoverHandler;
  depth: number;
  handleNodeClick: NodeClickHandler;
  highlightDOMNode: NodeHoverHandler;
  lexicalKey: string;
  monospaceWidth: string;
}

export type LexicalKey = `__lexicalKey_${string}`;

export interface LexicalHTMLElement extends HTMLElement {
  [key: LexicalKey]: string;
  __lexicalEditor: LexicalEditor;
}

export type NodeClickHandler = (props: NodeProps) => void;

export type NodeHoverHandler = (lexicalKey: string) => void;

export type NodeProps = Record<string, string | number>;

export type CloneInto = (
  arg: {lexicalKey: string},
  arg2: Window,
) => {data: {lexicalKey: string}};
