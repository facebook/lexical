/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {DevToolsTree} from 'packages/lexical-devtools/types';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';

import TreeView from '../TreeView';

function App(): JSX.Element {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nodeMap, setNodeMap] = useState<DevToolsTree>({});
  const port = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    // create and initialize the messaging port to receive editorState updates
    port.current = window.chrome.runtime.connect();

    // post init message to background JS so tabId will be registered
    port.current.postMessage({
      name: 'init',
      tabId: window.chrome.devtools.inspectedWindow.tabId,
      type: 'FROM_APP',
    });
  }, [port]);

  useEffect(() => {
    if (port.current !== null) {
      // message listener for editorState updates from inspectedWindow
      port.current.onMessage.addListener(
        (message: {editorState: {nodeMap: DevToolsTree}}) => {
          setCount(count + 1);
          setIsLoading(false);
          const newNodeMap = message.editorState.nodeMap;
          setNodeMap(newNodeMap);
        },
      );
    }
  });

  return (
    <div className="App">
      <header className="App-header">
        <p>Lexical Developer Tools</p>
      </header>
      {isLoading ? (
        <div className="loading-view">
          <p>Loading...</p>
        </div>
      ) : (
        <TreeView viewClassName="tree-view-output" nodeMap={nodeMap} />
      )}
    </div>
  );
}

export default App;
