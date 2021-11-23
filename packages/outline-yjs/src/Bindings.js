/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Cursor} from './SyncCursors';
import type {NodeKey, EditorState, OutlineEditor} from 'outline';
import type {Provider} from '.';
import type {Doc} from 'yjs';
import type {CollabBlockNode} from './CollabBlockNode';
import type {CollabTextNode} from './CollabTextNode';
import type {CollabDecoratorNode} from './CollabDecoratorNode';
import type {CollabLineBreakNode} from './CollabLineBreakNode';

import {createCollabBlockNode} from './CollabBlockNode';
import {XmlText} from 'yjs';

// $FlowFixMe: needs proper typings
export type YjsNodeMap = Map<NodeKey, Object>;

// $FlowFixMe: needs proper typings
export type ReverseYjsNodeMap = Map<Object, NodeKey>;

export type ClientID = string;

export type Binding = {
  collabNodeMap: Map<
    NodeKey,
    | CollabBlockNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode,
  >,
  nodeProperties: Map<string, Array<string>>,
  editor: OutlineEditor,
  id: string,
  cursors: Map<ClientID, Cursor>,
  cursorsContainer: null | HTMLElement,
  doc: Doc,
  root: CollabBlockNode,
  processedStates: Set<EditorState>,
  docMap: Map<string, Doc>,
};

export function createBinding(
  editor: OutlineEditor,
  provider: Provider,
  id: string,
  docMap: Map<string, Doc>,
): Binding {
  const doc = docMap.get(id);
  if (doc === undefined) {
    throw new Error('Should never happen');
  }
  // $FlowFixMe: our Flow bindings need fixing
  const binding: Binding = {
    collabNodeMap: new Map(),
    nodeProperties: new Map(),
    editor,
    id,
    cursors: new Map(),
    cursorsContainer: null,
    doc,
    // $FlowFixMe: we set the root after
    root: null,
    processedStates: new Set(),
    docMap,
  };
  // $FlowFixMe: this will work
  const rootXmlText: XmlText = doc.get('root', XmlText);
  const root: CollabBlockNode = createCollabBlockNode(
    rootXmlText,
    null,
    'root',
  );
  binding.root = root;
  root._key = 'root';
  return binding;
}
