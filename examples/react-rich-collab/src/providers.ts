/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Provider} from '@lexical/yjs';
import {WebrtcProvider} from 'y-webrtc';
import {WebsocketProvider} from 'y-websocket';
import * as Y from 'yjs';

let idSuffix = 0; // In React Strict mode "new WebrtcProvider" may be called twice

/**
 * Allows browser windows/tabs to communicate with each other w/o a server (if origin is the same)
 * using BroadcastChannel API. Useful for demo purposes.
 */
export function createWebRTCProvider(
  id: string,
  yjsDocMap: Map<string, Y.Doc>,
): Provider {
  const doc = getDocFromMap(id, yjsDocMap);

  // localStorage.log = 'true' in browser console to enable logging
  const provider = new WebrtcProvider(`${id}/${idSuffix++}`, doc, {
    peerOpts: {
      reconnectTimer: 100,
    },
    signaling:
      window.location.hostname === 'localhost' ? ['ws://localhost:1235'] : [],
  });

  // @ts-expect-error TODO: FIXME
  return provider;
}

export function createWebsocketProvider(
  id: string,
  yjsDocMap: Map<string, Y.Doc>,
): Provider {
  const doc = getDocFromMap(id, yjsDocMap);

  // @ts-expect-error TODO: FIXME
  return new WebsocketProvider('ws://localhost:1234', id, doc, {
    connect: false,
  });
}

function getDocFromMap(id: string, yjsDocMap: Map<string, Y.Doc>): Y.Doc {
  let doc = yjsDocMap.get(id);

  if (doc === undefined) {
    doc = new Y.Doc();
    yjsDocMap.set(id, doc);
  } else {
    doc.load();
  }

  return doc;
}
