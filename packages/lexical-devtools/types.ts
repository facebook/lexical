/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  GridSelection,
  LexicalEditor,
  NodeSelection,
  RangeSelection,
} from 'lexical';
import {
  ElementPointType,
  TextPointType,
} from 'packages/lexical/src/LexicalSelection';

export interface DevToolsTree {
  [key: string]: DevToolsNode;
}

export interface DevToolsNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x: string]: any;
  __text?: string;
  __type: string;
  children: Array<DevToolsNode>;
  deHighlightDOMNode: (lexicalKey: string) => void;
  depth: number;
  handleNodeClick: (props: NodeProperties) => void;
  highlightDOMNode: (lexicalKey: string) => void;
  lexicalKey: string;
  monospaceWidth: string;
}

export type DevToolsSelection =
  | GridSelectionJSON
  | NodeSelection
  | RangeSelectionJSON;

// the anchor property as PointType includes a _selection property
// when anchor is present on a selection object, it creates circularity
// we have to remove this circularity in order to serialize the selection as JSON
export type PointTypeJSON =
  | (Omit<TextPointType, '_selection'> & {
      [key: string]: unknown;
    })
  | (Omit<ElementPointType, '_selection'> & {
      [key: string]: unknown;
    });

export interface GridSelectionJSON
  extends Omit<GridSelection, 'anchor' | 'focus'> {
  anchor: PointTypeJSON;
  focus: PointTypeJSON;
}

export interface RangeSelectionJSON
  extends Omit<RangeSelection, 'anchor' | 'focus'> {
  anchor: PointTypeJSON;
  focus: PointTypeJSON;
}

export type LexicalKey = `__lexicalKey_${string}`;

// allow lookup of a Lexical HTML element's lexicalKey
// lexicalKey is stored on the DOM node under key __lexicalKey_{editorKey}
// where editorKey is a 5 letter string, dynamically generated with each editor instance
export interface LexicalHTMLElement extends HTMLElement {
  [key: LexicalKey]: string;
  __lexicalEditor: LexicalEditor;
}

export type NodeProperties = Record<string, NodeProperty>;

export type NodeProperty = string | number | boolean | Array<string | number>;

export type CloneInto = (
  arg: {lexicalKey: string},
  arg2: Window,
) => {data: {lexicalKey: string}};
