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
  const [isTypeahead, setTypeahead] = useState(false);
  const handleOnChange = useCallback((newViewModel) => {
    requestAnimationFrame(() => setViewModel(newViewModel));
  }, []);

  return (
    <>
      <header>
        <h1>Outline Playground</h1>
      </header>
      <div className="switches">
        <Switch
          id="rich-text-switch"
          onClick={() => setRichText(!isRichText)}
          checked={isRichText}
          text="Rich Text"
        />
        <Switch
          id="character-count-switch"
          onClick={() => setCharLimit(!isCharLimit)}
          checked={isCharLimit}
          text="Char Limit"
        />
        <Switch
          id="typeahead-switch"
          onClick={() => setTypeahead(!isTypeahead)}
          checked={isTypeahead}
          text="Typeahead"
        />
      </div>
      <div className="editor-shell">
        {isRichText ? (
          <RichTextEditor
            isCharLimit={isCharLimit}
            isTypeahead={isTypeahead}
            onChange={handleOnChange}
          />
        ) : (
          <PlainTextEditor
            isCharLimit={isCharLimit}
            isTypeahead={isTypeahead}
            onChange={handleOnChange}
          />
        )}
      </div>
      <TreeView viewModel={viewModel} />
    </>
  );
}

export default App;
