/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  Doc,
  RelativePosition,
  UndoManager,
  XmlElement,
  XmlText,
  Map as YMap,
  AbstractType,
} from 'yjs';
import type {
  DecoratorNode,
  EditorState,
  ElementNode,
  LexicalCommand,
  LexicalEditor,
  LineBreakNode,
  NodeMap,
  NodeKey,
  TextNode,
  IntentionallyMarkedAsDirtyElement,
} from 'lexical';
export type YjsEvent = Record<string, any>;
export type UserState = {
  anchorPos: null | RelativePosition;
  color: string;
  focusing: boolean;
  focusPos: null | RelativePosition;
  name: string;
};
export type ProviderAwareness = {
  getLocalState: () => UserState | null;
  getStates: () => Map<number, UserState>;
  off: (type: 'update', cb: () => void) => void;
  on: (type: 'update', cb: () => void) => void;
  setLocalState: (arg0: UserState) => void;
};
declare interface Provider {
  awareness: ProviderAwareness;
  connect(): void | Promise<void>;
  disconnect(): void;
  off(type: 'sync', cb: (isSynced: boolean) => void): void;
  off(type: 'update', cb: (arg0: any) => void): void;
  off(type: 'status', cb: (arg0: {status: string}) => void): void;
  off(type: 'reload', cb: (doc: Doc) => void): void;
  on(type: 'sync', cb: (isSynced: boolean) => void): void;
  on(type: 'status', cb: (arg0: {status: string}) => void): void;
  on(type: 'update', cb: (arg0: any) => void): void;
  on(type: 'reload', cb: (doc: Doc) => void): void;
}
export type ClientID = number;
export type CursorSelection = {
  anchor: {
    key: NodeKey;
    offset: number;
  };
  caret: HTMLElement;
  color: string;
  focus: {
    key: NodeKey;
    offset: number;
  };
  name: HTMLSpanElement;
  selections: Array<HTMLElement>;
};
export type Cursor = {
  color: string;
  name: string;
  selection: null | CursorSelection;
};
export type TextOperation = {
  insert?: string | object | AbstractType<unknown>;
  delete?: number;
  retain?: number;
  attributes?: {
    [x: string]: unknown;
  };
};

export type Binding = {
  clientID: number;
  collabNodeMap: Map<
    NodeKey,
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode
  >;
  cursors: Map<ClientID, Cursor>;
  cursorsContainer: null | HTMLElement;
  doc: Doc;
  docMap: Map<string, Doc>;
  editor: LexicalEditor;
  id: string;
  nodeProperties: Map<string, Array<string>>;
  root: CollabElementNode;
};
export declare class CollabDecoratorNode {
  _xmlElem: XmlElement;
  _key: NodeKey;
  _parent: CollabElementNode;
  _type: string;
  _unobservers: Set<() => void>;
  constructor(xmlElem: XmlElement, parent: CollabElementNode, type: string);
  getPrevNode(nodeMap: null | NodeMap): null | DecoratorNode<unknown>;
  getNode(): null | DecoratorNode<unknown>;
  getSharedType(): XmlElement;
  getType(): string;
  getKey(): NodeKey;
  getSize(): number;
  getOffset(): number;
  syncPropertiesFromLexical(
    binding: Binding,
    nextLexicalNode: DecoratorNode<unknown>,
    prevNodeMap: null | NodeMap,
  ): void;
  syncPropertiesFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void;
  destroy(binding: Binding): void;
}
export declare class CollabLineBreakNode {
  _map: YMap<unknown>;
  _key: NodeKey;
  _parent: CollabElementNode;
  _type: 'linebreak';
  constructor(map: YMap<unknown>, parent: CollabElementNode);
  getNode(): null | LineBreakNode;
  getKey(): NodeKey;
  getSharedType(): YMap<unknown>;
  getType(): string;
  getSize(): number;
  getOffset(): number;
  destroy(binding: Binding): void;
}
export declare class CollabTextNode {
  _map: YMap<unknown>;
  _key: NodeKey;
  _parent: CollabElementNode;
  _text: string;
  _type: string;
  _normalized: boolean;
  constructor(
    map: YMap<unknown>,
    text: string,
    parent: CollabElementNode,
    type: string,
  );
  getPrevNode(nodeMap: null | NodeMap): null | TextNode;
  getNode(): null | TextNode;
  getSharedType(): YMap<unknown>;
  getType(): string;
  getKey(): NodeKey;
  getSize(): number;
  getOffset(): number;
  spliceText(index: number, delCount: number, newText: string): void;
  syncPropertiesAndTextFromLexical(
    binding: Binding,
    nextLexicalNode: TextNode,
    prevNodeMap: null | NodeMap,
  ): void;
  syncPropertiesAndTextFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void;
  destroy(binding: Binding): void;
}
export declare class CollabElementNode {
  _key: NodeKey;
  _children: Array<
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode
  >;
  _xmlText: XmlText;
  _type: string;
  _parent: null | CollabElementNode;
  constructor(xmlText: XmlText, parent: null | CollabElementNode, type: string);
  getPrevNode(nodeMap: null | NodeMap): null | ElementNode;
  getNode(): null | ElementNode;
  getSharedType(): XmlText;
  getType(): string;
  getKey(): NodeKey;
  isEmpty(): boolean;
  getSize(): number;
  getOffset(): number;
  syncPropertiesFromYjs(
    binding: Binding,
    keysChanged: null | Set<string>,
  ): void;
  applyChildrenYjsDelta(binding: Binding, deltas: Array<TextOperation>): void;
  syncChildrenFromYjs(binding: Binding): void;
  syncPropertiesFromLexical(
    binding: Binding,
    nextLexicalNode: ElementNode,
    prevNodeMap: null | NodeMap,
  ): void;
  _syncChildFromLexical(
    binding: Binding,
    index: number,
    key: NodeKey,
    prevNodeMap: null | NodeMap,
    dirtyElements: null | Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
    dirtyLeaves: null | Set<NodeKey>,
  ): void;
  syncChildrenFromLexical(
    binding: Binding,
    nextLexicalNode: ElementNode,
    prevNodeMap: null | NodeMap,
    dirtyElements: null | Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
    dirtyLeaves: null | Set<NodeKey>,
  ): void;
  append(
    collabNode:
      | CollabElementNode
      | CollabDecoratorNode
      | CollabTextNode
      | CollabLineBreakNode,
  ): void;
  splice(
    binding: Binding,
    index: number,
    delCount: number,
    collabNode?:
      | CollabElementNode
      | CollabDecoratorNode
      | CollabTextNode
      | CollabLineBreakNode,
  ): void;
  getChildOffset(
    collabNode:
      | CollabElementNode
      | CollabTextNode
      | CollabDecoratorNode
      | CollabLineBreakNode,
  ): number;
  destroy(binding: Binding): void;
}

export function createUndoManager(binding: Binding, root: XmlText): UndoManager;

export function initLocalState(
  provider: Provider,
  name: string,
  color: string,
  focusing: boolean,
): void;

export function setLocalStateFocus(
  provider: Provider,
  name: string,
  color: string,
  focusing: boolean,
): void;

export function createBinding(
  editor: LexicalEditor,
  provider: Provider,
  id: string,
  doc: Doc | null | undefined,
  docMap: Map<string, Doc>,
): Binding;

export function syncCursorPositions(binding: Binding, provider: Provider): void;

export function syncLexicalUpdateToYjs(
  binding: Binding,
  provider: Provider,
  prevEditorState: EditorState,
  currEditorState: EditorState,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  dirtyLeaves: Set<NodeKey>,
  normalizedNodes: Set<NodeKey>,
  tags: Set<string>,
): void;

export function syncYjsChangesToLexical(
  binding: Binding,
  provider: Provider,
  events: Array<YjsEvent>,
): void;
export declare var CONNECTED_COMMAND: LexicalCommand<boolean>;
export declare var TOGGLE_CONNECT_COMMAND: LexicalCommand<boolean>;
export type {Provider};
