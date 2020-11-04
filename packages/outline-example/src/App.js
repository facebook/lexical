import React from 'react';
import {useState} from 'react';
import Editor from './Editor';

function App() {
  const [viewModel, setViewModel] = useState(null);

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
