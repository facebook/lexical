/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Cursor} from './Cursors';
import type {NodeKey, EditorState} from 'outline';
import type {Provider, YjsDoc} from '.';

// $FlowFixMe: need Flow typings for yjs
import {XmlElement} from 'yjs';

// $FlowFixMe: needs proper typings
export type YjsNodeMap = Map<NodeKey, Object>;

// $FlowFixMe: needs proper typings
export type ReverseYjsNodeMap = Map<Object, NodeKey>;

export type ClientID = string;

export type Binding = {
  id: string,
  cursors: Map<ClientID, Cursor>,
  cursorsContainer: null | HTMLElement,
  // $FlowFixMe: needs proper typings
  doc: Object,
  // $FlowFixMe: needs proper typings
  root: Object,
  nodeMap: YjsNodeMap,
  reverseNodeMap: ReverseYjsNodeMap,
  processedStates: Set<EditorState>,
  docMap: Map<string, YjsDoc>,
};

export function createBinding(
  provider: Provider,
  id: string,
  docMap: Map<string, YjsDoc>,
): Binding {
  const doc = docMap.get(id);
  if (doc === undefined) {
    throw new Error('Should never happen');
  }
  const root = doc.get('root', XmlElement);
  root.nodeName = 'root';
  const binding = {
    id,
    cursors: new Map(),
    cursorsContainer: null,
    doc,
    root,
    nodeMap: new Map([['root', root]]),
    reverseNodeMap: new Map([[root, 'root']]),
    processedStates: new Set(),
    docMap,
  };
  return binding;
}
