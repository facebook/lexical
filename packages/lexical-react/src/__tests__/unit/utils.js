/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import ReactTestUtils from 'react-dom/test-utils';
import * as Y from 'yjs';

import {
  CollaborationPlugin,
  useCollaborationContext,
} from '../../LexicalCollaborationPlugin';
import LexicalComposer from '../../LexicalComposer';
import LexicalRichTextPlugin from '../../LexicalRichTextPlugin';

function Editor({doc, provider, setEditor}) {
  const {yjsDocMap} = useCollaborationContext();
  const [editor] = useLexicalComposerContext();

  yjsDocMap.set('main', doc);

  setEditor(editor);

  return (
    <>
      <CollaborationPlugin
        id="main"
        providerFactory={() => provider}
        shouldBootstrap={true}
      />
      <LexicalRichTextPlugin
        contentEditable={<LexicalContentEditable />}
        placeholder={null}
      />
    </>
  );
}

class Client {
  constructor(id, connection) {
    this._id = id;
    this._reactRoot = null;
    this._container = null;
    this._connection = connection;
    this._connected = false;
    this._doc = new Y.Doc();
    this._awarenessState = {};
    this._onUpdate = this._onUpdate.bind(this);
    this._doc.on('update', this._onUpdate);
    this._listeners = new Map();
    this._updates = [];
    this._editor = null;

    this.awareness = {
      getLocalState() {
        return this._awarenessState;
      },
      getStates() {
        return [[0, this._awarenessState]];
      },
      off() {
        // TODO
      },
      on() {
        // TODO
      },
      setLocalState(state) {
        this._awarenessState = state;
      },
    };
  }

  _onUpdate(update, origin, transaction) {
    if (origin !== this._connection && this._connected) {
      this._broadcastUpdate(update);
    }
  }

  _broadcastUpdate(update) {
    this._connection._clients.forEach((client) => {
      if (client !== this) {
        if (client._connected) {
          Y.applyUpdate(client._doc, update, this._connection);
        } else {
          client._updates.push(update);
        }
      }
    });
  }

  connect() {
    if (!this._connected) {
      this._connected = true;
      const update = Y.encodeStateAsUpdate(this._doc);
      if (this._updates.length > 0) {
        Y.applyUpdate(
          this._doc,
          Y.mergeUpdates(this._updates),
          this._connection,
        );
        this._updates = [];
      }
      this._broadcastUpdate(update);
      this._dispatch('sync', true);
    }
  }

  disconnect() {
    this._connected = false;
  }

  start(rootContainer) {
    const container = document.createElement('div');
    const reactRoot = createRoot(container);
    this._container = container;
    this._reactRoot = reactRoot;
    rootContainer.appendChild(container);
    ReactTestUtils.act(() => {
      reactRoot.render(
        <LexicalComposer initialConfig={{}}>
          <Editor
            provider={this}
            doc={this._doc}
            setEditor={(editor) => (this._editor = editor)}
          />
        </LexicalComposer>,
      );
    });
  }

  stop() {
    ReactTestUtils.act(() => {
      this._reactRoot.render(null);
    });
    this._container.parentNode.removeChild(this._container);
    this._contianer = null;
  }

  on(type, callback) {
    let listenerSet = this._listeners.get(type);

    if (listenerSet === undefined) {
      listenerSet = new Set();
      this._listeners.set(type, listenerSet);
    }
    listenerSet.add(callback);
  }

  off(type, callback) {
    const listenerSet = this._listeners.get(type);

    if (listenerSet !== undefined) {
      listenerSet.delete(callback);
    }
  }

  _dispatch(type, data) {
    const listenerSet = this._listeners.get(type);

    if (listenerSet !== undefined) {
      listenerSet.forEach((callback) => callback(data));
    }
  }

  getHTML() {
    return this._container.firstChild.innerHTML;
  }

  getDocJSON() {
    return this._doc.toJSON();
  }

  getEditorState() {
    return this._editor.getEditorState();
  }

  getEditor() {
    return this._editor;
  }

  getContainer() {
    return this._container;
  }

  async focus() {
    this._container.focus();
    await Promise.resolve().then();
  }

  update(cb) {
    this._editor.update(cb);
  }
}

class TestConnection {
  constructor() {
    this._clients = new Map();
  }

  createClient(id) {
    const client = new Client(id, this);
    this._clients.set(id, client);
    return client;
  }
}

export function createTestConnection() {
  return new TestConnection();
}

export async function waitForReact(cb) {
  await ReactTestUtils.act(async () => {
    cb();
    await Promise.resolve().then();
  });
}

export function createAndStartClients(
  connector: TestConnection,
  aContainer: any,
  count: number,
): Array<Client> {
  const result = [];
  for (let i = 0; i < count; ++i) {
    const id = `${i}`;
    const client = connector.createClient(id);
    client.start(aContainer);
    result.push(client);
  }
  return result;
}

export function disconnectClients(clients: Array<Client>) {
  for (let i = 0; i < clients.length; ++i) {
    clients[i].disconnect();
  }
}

export function connectClients(clients: Array<Client>) {
  for (let i = 0; i < clients.length; ++i) {
    clients[i].connect();
  }
}

export function stopClients(clients: Array<Client>) {
  for (let i = 0; i < clients.length; ++i) {
    clients[i].stop();
  }
}

export function testClientsForEquality(clients: Array<Client>) {
  for (let i = 1; i < clients.length; ++i) {
    expect(clients[0].getHTML()).toEqual(clients[i].getHTML());
    expect(clients[0].getDocJSON()).toEqual(clients[i].getDocJSON());
  }
}
