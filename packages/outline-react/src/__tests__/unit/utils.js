/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {createRoot} from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';
import useOutlineRichTextWithCollab from '../../useOutlineRichTextWithCollab';
import useOutline from '../../useOutline';
import * as Y from 'yjs';

const editorConfig = {
  theme: {},
};

function ClientEditor({id, provider, docMap, name, color, setEditor}) {
  const [editor, rootElementRef] = useOutline(editorConfig);
  useOutlineRichTextWithCollab(editor, 'main', provider, docMap, name, color);

  setEditor(editor);

  return <div contentEditable={true} ref={rootElementRef} />;
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
    this._localUpdates = [];
    this._remoteUpdates = [];
    this._listeners = new Map();
    this._editor = null;

    this.awareness = {
      getLocalState() {
        return this._awarenessState;
      },
      setLocalState(state) {
        this._awarenessState = state;
      },
      getStates() {
        return [[0, this._awarenessState]];
      },
      on() {
        // TODO
      },
      off() {
        // TODO
      },
    };
  }

  _onUpdate(update, origin) {
    if (origin !== this._connection) {
      this._remoteUpdates.push(update);
      if (this._connected) {
        this._flushRemoteUpdates();
      }
    }
  }

  _flushRemoteUpdates() {
    if (this._remoteUpdates.length > 0) {
      const updates = this._remoteUpdates.slice();
      this._remoteUpdates = [];
      this._connection._clients.forEach((client) => {
        if (client !== this) {
          client._localUpdates.push(...updates);
          if (client._connected) {
            client._flushLocalUpdates();
          }
        }
      });
    }
  }

  _flushLocalUpdates() {
    if (this._localUpdates.length > 0) {
      const updates = this._localUpdates.slice();
      this._localUpdates = [];
      Y.applyUpdate(this._doc, Y.mergeUpdates(updates), this._connection);
    }
  }

  connect() {
    if (!this._connected) {
      this._connected = true;
      this._flushLocalUpdates();
      this._flushRemoteUpdates();
      this._dispatch('sync', true);
    }
  }

  disconnect() {
    this._connected = false;
  }

  start(rootContainer) {
    const container = document.createElement('div');
    const reactRoot = createRoot(container);
    const docMap = new Map([['main', this._doc]]);
    this._container = container;
    this._reactRoot = reactRoot;
    rootContainer.appendChild(container);
    ReactTestUtils.act(() => {
      reactRoot.render(
        <ClientEditor
          setEditor={(editor) => {
            this._editor = editor;
          }}
          id={this._id}
          provider={this}
          docMap={docMap}
          name={this._id}
          color="None"
        />,
        container,
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
    return this._container.innerHTML;
  }

  getDocJSON() {
    return this._doc.toJSON();
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
