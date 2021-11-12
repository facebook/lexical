/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe: need Flow typings for yjs
import {XmlElement} from 'yjs';

// $FlowFixMe: needs proper typings
export type YjsNodeMap = Map<NodeKey, Object>;

// $FlowFixMe: needs proper typings
export type ReverseYjsNodeMap = Map<Object, NodeKey>;

// $FlowFixMe: needs proper typings
export type Provider = Object;

// $FlowFixMe: needs proper typings
export type YjsDoc = Object;

export type Binding = {
  // $FlowFixMe: needs proper typings
  doc: Object,
  // $FlowFixMe: needs proper typings
  root: Object,
  nodeMap: YjsNodeMap,
  reverseNodeMap: ReverseYjsNodeMap,
};

export function createBinding(provider: Provider, doc: YjsDoc): Binding {
  const root = doc.get('root', XmlElement);
  root.nodeName = 'root';
  const binding = {
    doc,
    root,
    nodeMap: new Map([['root', root]]),
    reverseNodeMap: new Map([[root, 'root']]),
  };
  return binding;
}

export {syncOutlineUpdateToYjs, syncYjsChangesToOutline} from './Syncing';
