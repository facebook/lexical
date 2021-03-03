// @flow strict-local

import type {ViewModel} from 'outline';

import * as React from 'react';
import {useCallback, useState} from 'react';
import {RichTextEditor, PlainTextEditor} from './Editor';
import TreeView from './TreeView';
import Switch from './Switch';

function App(): React$Node {
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);
  const [isRichText, setRichText] = useState(true);
  const [isCharLimit, setCharLimit] = useState(false);
  const [isAutocomplete, setAutocomplete] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const handleOnChange = useCallback((newViewModel) => {
    requestAnimationFrame(() => setViewModel(newViewModel));
  }, []);

  return (
    <>
      <header>
        <img src="logo.svg" alt="Outline Logo" />
        <button
          id="options-button"
          onClick={() => setShowOptions(!showOptions)}>
          <span />
        </button>
      </header>
      {showOptions && (
        <div className="switches">
          <Switch
            onClick={() => setRichText(!isRichText)}
            checked={isRichText}
            text="Rich Text"
          />
          <Switch
            onClick={() => setCharLimit(!isCharLimit)}
            checked={isCharLimit}
            text="Char Limit"
          />
          <Switch
            onClick={() => setAutocomplete(!isAutocomplete)}
            checked={isAutocomplete}
            text="Autocomplete"
          />
        </div>
      )}
      <div className="editor-shell">
        {isRichText ? (
          <RichTextEditor
            isCharLimit={isCharLimit}
            isAutocomplete={isAutocomplete}
            onChange={handleOnChange}
          />
        ) : (
          <PlainTextEditor
            isCharLimit={isCharLimit}
            isAutocomplete={isAutocomplete}
            onChange={handleOnChange}
          />
        )}
      </div>
      <TreeView viewModel={viewModel} />
    </>
  );
}

export default App;
