/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './index.css';

import {EditorState} from 'lexical';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';

import logo from '../../../images/lexical-white.png';

function App(): JSX.Element {
  const [count, setCount] = useState<number>(0);
  const [, setEditorState] = useState<EditorState | null>(null);
  const port = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    // create and initialize the messaging port to receive editorState updates
    port.current = window.chrome.runtime.connect();

    port.current.postMessage({
      name: 'init',
      tabId: window.chrome.devtools.inspectedWindow.tabId,
      type: 'FROM_APP',
    });
  }, [port]);

  useEffect(() => {
    if (port.current !== null) {
      port.current.onMessage.addListener(
        (message: {editorState: EditorState}) => {
          setCount(count + 1);
          setEditorState(message.editorState);
        },
      );
    }
  });

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Lexical Developer Tools</p>
        <p>
          <code>editorState</code> updates: {count}
        </p>
      </header>
    </div>
  );
}

export default App;
