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
import type {Doc} from 'yjs';

import {Klass, LexicalNode} from 'lexical';
import invariant from 'shared/invariant';
import {XmlText} from 'yjs';

import {$createCollabElementNode} from './CollabElementNode';

export type ClientID = number;
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
  excludedProperties: ExcludedProperties;
};
export type ExcludedProperties = Map<Klass<LexicalNode>, Set<string>>;

export type CreateBindingOptions = {
  editor: LexicalEditor;
  id: string;
  getXmlText?: (ydoc: Doc) => XmlText;
  doc: Doc | null | undefined;
  docMap: Map<string, Doc>;
  excludedProperties?: ExcludedProperties;
};

export function createBinding({
  editor,
  id,
  getXmlText = (ydoc) => ydoc.get('root', XmlText) as XmlText,
  doc,
  docMap,
  excludedProperties,
}: CreateBindingOptions): Binding {
  invariant(
    doc !== undefined && doc !== null,
    'createBinding: doc is null or undefined',
  );
  const rootXmlText = getXmlText(doc);
  const root: CollabElementNode = $createCollabElementNode(
    rootXmlText,
    null,
    'root',
  );
  root._key = 'root';
  return {
    clientID: doc.clientID,
    collabNodeMap: new Map(),
    cursors: new Map(),
    cursorsContainer: null,
    doc,
    docMap,
    editor,
    excludedProperties: excludedProperties || new Map(),
    id,
    nodeProperties: new Map(),
    root,
  };
}
