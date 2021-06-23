/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {ViewModel} from 'outline';

import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';
import {useRichTextEditor, usePlainTextEditor} from './Editor';
import TreeView from './TreeView';
import useOptions from './useOptions';
import useStepRecorder from './useStepRecorder';
import useTestRecorder from './useTestRecorder';
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
  const onError = useCallback((e: Error) => {
    throw e;
  }, []);
  const [editor, editorComponent] = useRichTextEditor({
    onChange,
    onError,
    isCharLimit,
    isAutocomplete,
  });
  const [stepRecorderButton, stepRecorderOutput] = useStepRecorder(editor);
  const [testRecorderButton, testRecorderOutput] = useTestRecorder(editor);
  useTypingPerfTracker(measureTypingPerf);

  return (
    <>
      <div className="editor-shell">{editorComponent}</div>
      {showTreeView && <TreeView viewModel={viewModel} />}
      {stepRecorderOutput}
      {testRecorderOutput}
      <div className="editor-dev-toolbar">
        {optionsSwitches}
        {optionsButton}
        {stepRecorderButton}
        {testRecorderButton}
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
  const onError = useCallback((e: Error) => {
    throw e;
  }, []);
  const [editor, editorComponent] = usePlainTextEditor({
    onChange,
    onError,
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
