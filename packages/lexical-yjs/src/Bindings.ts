/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Provider} from '.';
import type {CollabDecoratorNode} from './CollabDecoratorNode';
import type {CollabLineBreakNode} from './CollabLineBreakNode';
import type {CollabTextNode} from './CollabTextNode';
import type {Cursor} from './SyncCursors';
import type {Klass, LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import invariant from '@lexical/internal/invariant';
import {type Doc, XmlElement, XmlText} from 'yjs';

import {
  $createCollabElementNode,
  type CollabElementNode,
} from './CollabElementNode';
import {CollabV2Mapping} from './CollabV2Mapping';
import {initializeNodeProperties} from './Utils';

export type ClientID = number;
export interface BaseBinding {
  clientID: number;
  cursors: Map<ClientID, Cursor>;
  cursorsContainer: null | HTMLElement;
  /**
   * For remote cursors, we lazily create stylesheet that hosts the `::highlight(...)` rules.
   * Editors mounted in different frames each adopt the sheet into their own document.
   */
  cursorHighlightSheet: CSSStyleSheet | null;
  doc: Doc;
  docMap: Map<string, Doc>;
  editor: LexicalEditor;
  id: string;
  nodeProperties: Map<string, {[property: string]: unknown}>; // node type to property to default value
  excludedProperties: ExcludedProperties;
}

export interface Binding extends BaseBinding {
  collabNodeMap: Map<
    NodeKey,
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode
  >;
  root: CollabElementNode;
}

export interface BindingV2 extends BaseBinding {
  mapping: CollabV2Mapping;
  root: XmlElement;
}

export type AnyBinding = Binding | BindingV2;

export type ExcludedProperties = Map<Klass<LexicalNode>, Set<string>>;

function createBaseBinding(
  editor: LexicalEditor,
  id: string,
  doc: Doc,
  docMap: Map<string, Doc>,
  excludedProperties?: ExcludedProperties,
): BaseBinding {
  const binding = {
    clientID: doc.clientID,
    cursorHighlightSheet: null,
    cursors: new Map(),
    cursorsContainer: null,
    doc,
    docMap,
    editor,
    excludedProperties: excludedProperties || new Map(),
    id,
    nodeProperties: new Map(),
  };
  initializeNodeProperties(binding);
  return binding;
}

/** Options for {@link createYjsBinding}. */
export interface CreateYjsBindingOptions {
  editor: LexicalEditor;
  /** Identifier for this binding, used as the key in `docMap`. */
  id: string;
  doc: Doc;
  docMap: Map<string, Doc>;
  excludedProperties?: ExcludedProperties;
  /** The key used to look up the root `XmlText` shared type on the Yjs `Doc`. Defaults to `'root'`. */
  rootName?: string;
}

/**
 * Create a V1 Yjs {@link Binding} that connects a {@link LexicalEditor} to a
 * Yjs `Doc` for real-time collaboration.
 *
 * For the legacy positional-argument API, see {@link createBinding}.
 */
export function createYjsBinding({
  editor,
  id,
  doc,
  docMap,
  excludedProperties,
  rootName = 'root',
}: CreateYjsBindingOptions): Binding {
  const rootXmlText = doc.get(rootName, XmlText) as XmlText;
  const root: CollabElementNode = $createCollabElementNode(
    rootXmlText,
    null,
    'root',
  );
  root._key = 'root';
  return {
    ...createBaseBinding(editor, id, doc, docMap, excludedProperties),
    collabNodeMap: new Map(),
    root,
  };
}

export function createBinding(
  editor: LexicalEditor,
  provider: Provider,
  id: string,
  doc: Doc | null | undefined,
  docMap: Map<string, Doc>,
  excludedProperties?: ExcludedProperties,
): Binding {
  invariant(
    doc !== undefined && doc !== null,
    'createBinding: doc is null or undefined',
  );
  return createYjsBinding({doc, docMap, editor, excludedProperties, id});
}

export function createBindingV2__EXPERIMENTAL(
  editor: LexicalEditor,
  id: string,
  doc: Doc | null | undefined,
  docMap: Map<string, Doc>,
  options: {excludedProperties?: ExcludedProperties; rootName?: string} = {},
): BindingV2 {
  invariant(
    doc !== undefined && doc !== null,
    'createBinding: doc is null or undefined',
  );
  const {excludedProperties, rootName = 'root-v2'} = options;
  return {
    ...createBaseBinding(editor, id, doc, docMap, excludedProperties),
    mapping: new CollabV2Mapping(),
    root: doc.get(rootName, XmlElement) as XmlElement,
  };
}

export function isBindingV1(binding: BaseBinding): binding is Binding {
  return Object.prototype.hasOwnProperty.call(binding, 'collabNodeMap');
}

export function isBindingV2(binding: BaseBinding): binding is BindingV2 {
  return Object.prototype.hasOwnProperty.call(binding, 'mapping');
}
