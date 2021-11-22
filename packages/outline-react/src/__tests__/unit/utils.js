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
    this._suspended = false;
    this._connected = false;
    this._doc = new Y.Doc();
    this._awarenessState = {};
    this._doc.on('update', (update) => {
      this._updates.push(update);
      if (this._connected && !this._suspended) {
        this._flushUpdates();
      }
    });
    this._updates = [];
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

  _flushUpdates() {
    this._updates.forEach((update) =>
      this._connection._clients.forEach((client) => {
        if (client === this) {
          return;
        }
        Y.applyUpdate(client._doc, update);
      }),
    );
    this._updates = [];
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

  connect() {
    if (!this._connected) {
      this._connected = true;
      this._flushUpdates();
      this._dispatch('sync', true);
    }
  }

  disconnect() {
    this._connected = false;
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

  async update(cb) {
    await ReactTestUtils.act(async () => {
      this._editor.update(cb);
      await Promise.resolve().then();
    });
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
