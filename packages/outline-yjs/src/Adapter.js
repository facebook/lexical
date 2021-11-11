/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe: need Flow typings for y-websocket
import {WebsocketProvider} from 'y-websocket';
// $FlowFixMe: need Flow typings for yjs
import {Doc, XmlElement} from 'yjs';

export type Adapter = {
  // $FlowFixMe: needs proper typings
  doc: Object,
  // $FlowFixMe: needs proper typings
  root: Object,
  // $FlowFixMe: needs proper typings
  provider: Object,
};

export function createWebsocketAdapter(
  websocketEndpoint: string,
  slug: string,
): Adapter {
  const doc = new Doc();
  const root = doc.get('root', XmlElement);
  const provider = new WebsocketProvider(websocketEndpoint, slug, doc, {
    connect: false,
  });
  const adapter = {
    doc,
    root,
    provider,
  };
  return adapter;
}
