/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {
  DevToolsSelection,
  DevToolsTree,
  NodeProperties,
} from 'packages/lexical-devtools/types';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import InspectedElementView from '../InspectedElementView';
import SelectionView from '../SelectionView';
import TimeTravelView from '../TimeTravelView';
import TreeView from '../TreeView';

function App(): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nodeMap, setNodeMap] = useState<DevToolsTree>({});
  const [selection, setSelection] = useState<DevToolsSelection | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeProperties | null>(null);
  const port = useRef<chrome.runtime.Port | null>(null);

  const updateEditorState = (message: {
    editorState: {nodeMap: DevToolsTree; selection: DevToolsSelection};
  }) => {
    setIsLoading(false);
    const newNodeMap = message.editorState.nodeMap;
    setNodeMap(newNodeMap);
    setSelection(message.editorState.selection);
  };

  // highlight & dehighlight the corresponding DOM nodes onHover of DevTools nodes
  const highlightDOMNode = useCallback(
    (lexicalKey: string) => {
      port.current?.postMessage({
        lexicalKey,
        name: 'highlight',
        tabId: window.chrome.devtools.inspectedWindow.tabId,
        type: 'FROM_APP',
      });
    },
    [port],
  );

  const deHighlightDOMNode = useCallback(
    (lexicalKey: string) => {
      port.current?.postMessage({
        name: 'dehighlight',
        tabId: window.chrome.devtools.inspectedWindow.tabId,
        type: 'FROM_APP',
      });
    },
    [port],
  );

  useEffect(() => {
    // create and initialize the messaging port to receive editorState updates
    port.current = window.chrome.runtime.connect();

    // post init message to background JS so tabId will be registered
    port.current.postMessage({
      name: 'init',
      tabId: window.chrome.devtools.inspectedWindow.tabId,
      type: 'FROM_APP',
    });

    return () => {
      if (port.current) port.current.disconnect();
      port.current = null;
    };
  }, [port]);

  useEffect(() => {
    if (port.current !== null) {
      // message listener for editorState updates from inspectedWindow
      port.current.onMessage.addListener(updateEditorState);
    }

    return () => {
      port.current?.onMessage.removeListener(updateEditorState);
    };
  });

  return (
    <>
      {isLoading ? (
        <div className="loading-view">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="App">
          <SelectionView selection={selection} />
          <TreeView
            deHighlightDOMNode={deHighlightDOMNode}
            handleNodeClick={setSelectedNode}
            highlightDOMNode={highlightDOMNode}
            viewClassName="tree-view-output"
            nodeMap={nodeMap}
          />
          <InspectedElementView nodeProps={selectedNode} />
          <TimeTravelView />
        </div>
      )}
    </>
  );
}

export default App;
