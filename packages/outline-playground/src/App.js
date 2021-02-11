// @flow strict-local

import type {ViewModel} from 'outline';

import React from 'react';
import {useCallback, useState} from 'react';
import {RichTextEditor, PlainTextEditor} from './Editor';
import TreeView from './TreeView';

function App(): React$Node {
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);
  const [isRichText, setRichText] = useState(true);
  const handleOnChange = useCallback((newViewModel) => {
    requestAnimationFrame(() => setViewModel(newViewModel));
  }, []);

  return (
    <>
      <header>
        <h1>Outline Playground</h1>
        <div id="editor-rich-text-switch">
          <label htmlFor="richTextMode">Rich Text</label>
          <button
            role="switch"
            aria-checked={isRichText}
            id="richTextMode"
            onClick={() => setRichText(!isRichText)}>
            <span />
          </button>
        </div>
      </header>
      <div className="editor-shell">
        {isRichText ? (
          <RichTextEditor onChange={handleOnChange} />
        ) : (
          <PlainTextEditor onChange={handleOnChange} />
        )}
      </div>
      <TreeView viewModel={viewModel} />
    </>
  );
}

export default App;
