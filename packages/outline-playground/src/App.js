// @flow strict-local

import type {ViewModel} from 'outline';

import * as React from 'react';
import {useCallback, useState} from 'react';
import {RichTextEditor, PlainTextEditor} from './Editor';
import TreeView from './TreeView';
import Switch from './Switch';
import useTypingPerfTracker from './useTypingPerfTracker';

function App(): React$Node {
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);
  const [isRichText, setRichText] = useState(true);
  const [isCharLimit, setCharLimit] = useState(false);
  const [isAutocomplete, setAutocomplete] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showTreeView, setShowTreeView] = useState(true);
  const [measureTypingPerf, setMeasureTypingPerf] = useState(false);
  useTypingPerfTracker(measureTypingPerf);
  const handleOnChange = useCallback(
    (newViewModel) => {
      if (showTreeView) {
        setViewModel(newViewModel);
      }
    },
    [showTreeView],
  );

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
            onClick={() => setMeasureTypingPerf(!measureTypingPerf)}
            checked={measureTypingPerf}
            text="Measure Perf"
          />
          <Switch
            onClick={() => setShowTreeView(!showTreeView)}
            checked={showTreeView}
            text="Tree View"
          />
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
      {showTreeView && <TreeView viewModel={viewModel} />}
    </>
  );
}

export default App;
