// @flow strict-local

import type {ViewModel} from 'outline';

import React from 'react';
import {useState} from 'react';
import Editor from './Editor';

function App(): React$Node {
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);

  return (
    <>
      <h1>OutlineJS Demo</h1>
      <div className="editor-shell">
        <Editor onChange={setViewModel} />
      </div>
      <pre>{JSON.stringify(viewModel, null, 2)}</pre>
    </>
  );
}

export default App;
