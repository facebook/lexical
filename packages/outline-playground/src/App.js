/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {Options} from './useOptions';

import * as React from 'react';
import {useCallback, useState} from 'react';
import {useRichTextEditor, usePlainTextEditor} from './Editor';
import OutlineTreeView from 'outline-react/OutlineTreeView';
import useOptions from './useOptions';
import useTestRecorder from './useTestRecorder';
import useTypingPerfTracker from './useTypingPerfTracker';

function RichTextEditor({options, onOptionChange}): React$Node {
  const [optionsButton, optionsSwitches] = useOptions(options, onOptionChange);
  const {measureTypingPerf, isCharLimit, isAutocomplete, showTreeView} =
    options;
  const onError = useCallback((e: Error, updateName: string) => {
    throw e;
  }, []);
  const [editor, editorComponent] = useRichTextEditor({
    onError,
    isCharLimit,
    isReadOnly: false,
    isAutocomplete,
  });
  const [testRecorderButton, testRecorderOutput] = useTestRecorder(editor);
  useTypingPerfTracker(measureTypingPerf);

  return (
    <>
      <div className="editor-shell">{editorComponent}</div>
      {showTreeView && (
        <OutlineTreeView className="tree-view-output" editor={editor} />
      )}
      {testRecorderOutput}
      <div className="editor-dev-toolbar">
        {optionsSwitches}
        {optionsButton}
        {testRecorderButton}
      </div>
    </>
  );
}

function PlainTextEditor({options, onOptionChange}): React$Node {
  const [optionsButton, optionsSwitches] = useOptions(options, onOptionChange);
  const {measureTypingPerf, isCharLimit, isAutocomplete, showTreeView} =
    options;
  const onError = useCallback((e: Error) => {
    throw e;
  }, []);
  const [editor, editorComponent] = usePlainTextEditor({
    onError,
    isCharLimit,
    isReadOnly: false,
    isAutocomplete,
  });
  useTypingPerfTracker(measureTypingPerf);

  return (
    <>
      <div className="editor-shell">{editorComponent}</div>
      {showTreeView && (
        <OutlineTreeView className="tree-view-output" editor={editor} />
      )}
      <div className="editor-dev-toolbar">
        {optionsSwitches}
        {optionsButton}
      </div>
    </>
  );
}

const DEFAULT_OPTIONS: {[$Keys<Options>]: boolean} = {
  measureTypingPerf: false,
  isRichText: true,
  isCharLimit: false,
  isAutocomplete: false,
  showTreeView: true,
};

// override default options with query parameters if any
const urlSearchParams = new URLSearchParams(window.location.search);
for (const param of Object.keys(DEFAULT_OPTIONS)) {
  if (urlSearchParams.has(param)) {
    try {
      const value = JSON.parse(urlSearchParams.get(param) ?? 'true');
      DEFAULT_OPTIONS[param] = Boolean(value);
    } catch (error) {
      console.warn(`Unable to parse query parameter "${param}"`);
    }
  }
}

function setURLParam(param: $Keys<Options>, value: boolean) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  if (value) {
    if (!params.has(param)) {
      params.append(param, 'true');
    }
  } else {
    params.delete(param);
  }
  url.search = params.toString();
  window.history.pushState(null, '', url.toString());
}

function App(): React$Node {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const setOption = useCallback((option: $Keys<Options>, value: boolean) => {
    setOptions((options) => ({
      ...options,
      [(option: string)]: value,
    }));
    setURLParam(option, value);
  }, []);

  return (
    <>
      <header>
        <img src="logo.svg" alt="Outline Logo" />
      </header>
      {options.isRichText ? (
        <RichTextEditor options={options} onOptionChange={setOption} />
      ) : (
        <PlainTextEditor options={options} onOptionChange={setOption} />
      )}
    </>
  );
}

export default App;
