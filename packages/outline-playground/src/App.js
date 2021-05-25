// @flow strict-local

import type {ViewModel} from 'outline';

import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';
import {useRichTextEditor, usePlainTextEditor} from './Editor';
import TreeView from './TreeView';
import useOptions from './useOptions';
import useStepRecorder from './useStepRecorder';
import useTypingPerfTracker from './useTypingPerfTracker';

function RichTextEditor({options, onOptionsChange}): React$Node {
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);
  const [optionsButton, optionsSwitches, opts] = useOptions(options);
  useEffect(() => {
    onOptionsChange(opts);
  }, [onOptionsChange, opts]);
  const {measureTypingPerf, isCharLimit, isAutocomplete, showTreeView} = opts;
  const onChange = useCallback(
    (newViewModel) => {
      if (showTreeView) {
        setViewModel(newViewModel);
      }
    },
    [showTreeView],
  );
  const [editor, editorComponent] = useRichTextEditor({
    onChange,
    isCharLimit,
    isAutocomplete,
  });
  const [stepRecorderButton, stepRecorderOutput] = useStepRecorder(editor);
  useTypingPerfTracker(measureTypingPerf);

  return (
    <>
      <div className="editor-shell">{editorComponent}</div>
      {showTreeView && <TreeView viewModel={viewModel} />}
      {stepRecorderOutput}
      <div className="editor-dev-toolbar">
        {optionsSwitches}
        {optionsButton}
        {stepRecorderButton}
      </div>
    </>
  );
}

function PlainTextEditor({options, onOptionsChange}): React$Node {
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);
  const [optionsButton, optionsSwitches, opts] = useOptions(options);
  const {measureTypingPerf, isCharLimit, isAutocomplete, showTreeView} = opts;
  useEffect(() => {
    onOptionsChange(opts);
  }, [onOptionsChange, opts]);
  const onChange = useCallback(
    (newViewModel) => {
      if (showTreeView) {
        setViewModel(newViewModel);
      }
    },
    [showTreeView],
  );
  const [editor, editorComponent] = usePlainTextEditor({
    onChange,
    isCharLimit,
    isAutocomplete,
  });
  const [stepRecorderButton, stepRecorderOutput] = useStepRecorder(editor);
  useTypingPerfTracker(measureTypingPerf);

  return (
    <>
      <div className="editor-shell">{editorComponent}</div>
      {showTreeView && <TreeView viewModel={viewModel} />}
      {stepRecorderOutput}
      <div className="editor-dev-toolbar">
        {optionsSwitches}
        {optionsButton}
        {stepRecorderButton}
      </div>
    </>
  );
}

const DEFAULT_OPTIONS = {
  measureTypingPerf: false,
  isRichText: true,
  isCharLimit: false,
  isAutocomplete: false,
  showTreeView: true,
  showOptions: false,
};

function App(): React$Node {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);

  return (
    <>
      <header>
        <img src="logo.svg" alt="Outline Logo" />
      </header>
      {options.isRichText ? (
        <RichTextEditor options={options} onOptionsChange={setOptions} />
      ) : (
        <PlainTextEditor options={options} onOptionsChange={setOptions} />
      )}
    </>
  );
}

export default App;
