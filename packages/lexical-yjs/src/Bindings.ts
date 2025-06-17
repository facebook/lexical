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
import {LexicalMapping} from './LexicalMapping';

export type ClientID = number;
export type BaseBinding = {
  clientID: number;
  cursors: Map<ClientID, Cursor>;
  cursorsContainer: null | HTMLElement;
  doc: Doc;
  docMap: Map<string, Doc>;
  editor: LexicalEditor;
  id: string;
  nodeProperties: Map<string, Array<string>>;
  excludedProperties: ExcludedProperties;
};
export type ExcludedProperties = Map<Klass<LexicalNode>, Set<string>>;

export type Binding = BaseBinding & {
  collabNodeMap: Map<
    NodeKey,
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode
  >;
  root: CollabElementNode;
};

export type BindingV2 = BaseBinding & {
  mapping: LexicalMapping;
  root: XmlElement;
};

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
  return {
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
  excludedProperties?: ExcludedProperties,
): BindingV2 {
  invariant(
    doc !== undefined && doc !== null,
    'createBinding: doc is null or undefined',
  );
  return {
    ...createBaseBinding(editor, id, doc, docMap, excludedProperties),
    mapping: new LexicalMapping(),
    root: doc.get('root-v2', XmlElement) as XmlElement,
  };
}

export function isBindingV1(binding: BaseBinding): binding is Binding {
  return Object.hasOwn(binding, 'collabNodeMap');
}

export function isBindingV2(binding: BaseBinding): binding is BindingV2 {
  return Object.hasOwn(binding, 'mapping');
}
