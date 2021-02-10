// @flow strict-local

import type {ViewModel} from 'outline';

import React from 'react';
import {useState} from 'react';
import Editor from './Editor';
import TreeView from './TreeView';

function App(): React$Node {
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);

  return (
    <>
      <h1>Outline Playground</h1>
      <div className="editor-shell">
        <Editor
          onChange={(newViewModel) => {
            requestAnimationFrame(() => setViewModel(newViewModel));
          }}
        />
      </div>
      <TreeView viewModel={viewModel} />
    </>
  );
}

export default App;
