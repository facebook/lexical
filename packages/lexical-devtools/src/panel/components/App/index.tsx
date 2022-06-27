/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './index.css';

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';

import logo from '../../../images/lexical-white.png';

function App(): JSX.Element {
  const [count, setCount] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editorState, setEditorState] = useState<object>({});
  const port = useRef<object>({});

  useEffect(() => {
    // create and initialize the messaging port to receive editorState updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (port.current as any) = window.chrome.runtime.connect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (port.current as any).postMessage({
      name: 'init',
      tabId: window.chrome.devtools.inspectedWindow.tabId,
      type: 'FROM_APP',
    });
  }, [port]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (port.current as any).onMessage.addListener(
      (message: {editorState: React.SetStateAction<object>}) => {
        setCount(count + 1);
        setEditorState(message.editorState);
      },
    );
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
