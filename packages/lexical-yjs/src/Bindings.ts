/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CollabDecoratorNode} from './CollabDecoratorNode';
import type {CollabElementNode} from './CollabElementNode';
import type {CollabLineBreakNode} from './CollabLineBreakNode';
import type {CollabTextNode} from './CollabTextNode';
import type {Cursor} from './SyncCursors';
import type {LexicalEditor, NodeKey} from 'lexical';

import {Klass, LexicalNode} from 'lexical';
import invariant from 'shared/invariant';
import {Doc, XmlElement, XmlText} from 'yjs';

import {Provider} from '.';
import {$createCollabElementNode} from './CollabElementNode';
import {CollabV2Mapping} from './CollabV2Mapping';
import {initializeNodeProperties} from './Utils';

export type ClientID = number;
export interface BaseBinding {
  clientID: number;
  cursors: Map<ClientID, Cursor>;
  cursorsContainer: null | HTMLElement;
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
  doc: Doc | null | undefined,
  docMap: Map<string, Doc>,
  excludedProperties?: ExcludedProperties,
): BaseBinding {
  invariant(
    doc !== undefined && doc !== null,
    'createBinding: doc is null or undefined',
  );
  const binding = {
    clientID: doc.clientID,
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
  const rootXmlText = doc.get('root', XmlText) as XmlText;
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
  return Object.hasOwn(binding, 'collabNodeMap');
}

export function isBindingV2(binding: BaseBinding): binding is BindingV2 {
  return Object.hasOwn(binding, 'mapping');
}
