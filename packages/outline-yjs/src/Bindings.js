/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Cursor} from './SyncCursors';
import type {NodeKey, OutlineEditor} from 'outline';
import type {Provider} from '.';
import type {Doc} from 'yjs';
import type {CollabElementNode} from './CollabElementNode';
import type {CollabTextNode} from './CollabTextNode';
import type {CollabDecoratorNode} from './CollabDecoratorNode';
import type {CollabLineBreakNode} from './CollabLineBreakNode';

import {$createCollabElementNode} from './CollabElementNode';
import {XmlText} from 'yjs';

export type ClientID = string;

export type Binding = {
  collabNodeMap: Map<
    NodeKey,
    | CollabElementNode
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
  root: CollabElementNode,
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

  // $FlowFixMe: this will work
  const rootXmlText: XmlText = doc.get('root', XmlText);
  const root: CollabElementNode = $createCollabElementNode(
    rootXmlText,
    null,
    'root',
  );
  root._key = 'root';

  // $FlowFixMe: our Flow bindings need fixing
  return {
    collabNodeMap: new Map(),
    nodeProperties: new Map(),
    editor,
    id,
    cursors: new Map(),
    cursorsContainer: null,
    doc,
    root,
    docMap,
  };
}
