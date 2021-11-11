/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {SettingName} from './appSettings';

import * as React from 'react';
import {useCallback, useState} from 'react';
import {
  useRichTextEditor,
  usePlainTextEditor,
  useRichTextEditorWithCollab,
} from './Editor';
import OutlineTreeView from 'outline-react/OutlineTreeView';
import useSettings from './useSettings';
import useTestRecorder from './useTestRecorder';
import useTypingPerfTracker from './useTypingPerfTracker';
import {DEFAULT_SETTINGS} from './appSettings';

function RichTextEditorImpl({
  editor,
  measureTypingPerf,
  editorComponent,
  showTreeView,
  settingsSwitches,
  settingsButton,
}): React$Node {
  const [testRecorderButton, testRecorderOutput] = useTestRecorder(editor);
  useTypingPerfTracker(measureTypingPerf);

  return (
    <>
      <div className="editor-shell">{editorComponent}</div>
      {showTreeView && (
        <OutlineTreeView
          viewClassName="tree-view-output"
          timeTravelPanelClassName="debug-timetravel-panel"
          timeTravelButtonClassName="debug-timetravel-button"
          timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
          timeTravelPanelButtonClassName="debug-timetravel-panel-button"
          editor={editor}
        />
      )}
      {testRecorderOutput}
      <div className="editor-dev-toolbar">
        {settingsSwitches}
        {settingsButton}
        {testRecorderButton}
      </div>
    </>
  );
}

function RichTextEditor({settings, onSettingsChange}): React$Node {
  const [settingsButton, settingsSwitches] = useSettings(
    settings,
    onSettingsChange,
  );
  const {
    measureTypingPerf,
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
    showTreeView,
  } = settings;
  const [editor, editorComponent] = useRichTextEditor({
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
  });

  return (
    <RichTextEditorImpl
      editor={editor}
      measureTypingPerf={measureTypingPerf}
      editorComponent={editorComponent}
      showTreeView={showTreeView}
      settingsSwitches={settingsSwitches}
      settingsButton={settingsButton}
    />
  );
}

function RichTextEditorWithCollaboration({
  settings,
  onSettingsChange,
}): React$Node {
  const [settingsButton, settingsSwitches] = useSettings(
    settings,
    onSettingsChange,
  );
  const {
    measureTypingPerf,
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
    showTreeView,
  } = settings;
  const [editor, editorComponent] = useRichTextEditorWithCollab({
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
  });

  return (
    <RichTextEditorImpl
      editor={editor}
      measureTypingPerf={measureTypingPerf}
      editorComponent={editorComponent}
      showTreeView={showTreeView}
      settingsSwitches={settingsSwitches}
      settingsButton={settingsButton}
    />
  );
}

function PlainTextEditor({settings, onSettingsChange}): React$Node {
  const [settingsButton, settingsSwitches] = useSettings(
    settings,
    onSettingsChange,
  );
  const {
    measureTypingPerf,
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
    showTreeView,
  } = settings;
  const onError = useCallback((e: Error) => {
    throw e;
  }, []);
  const [editor, editorComponent] = usePlainTextEditor({
    onError,
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
  });
  useTypingPerfTracker(measureTypingPerf);

  return (
    <>
      <div className="editor-shell">{editorComponent}</div>
      {showTreeView && (
        <OutlineTreeView
          viewClassName="tree-view-output"
          timeTravelPanelClassName="debug-timetravel-panel"
          timeTravelButtonClassName="debug-timetravel-button"
          timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
          timeTravelPanelButtonClassName="debug-timetravel-panel-button"
          editor={editor}
        />
      )}
      <div className="editor-dev-toolbar">
        {settingsSwitches}
        {settingsButton}
      </div>
    </>
  );
}

function setURLParam(param: SettingName, value: null | boolean) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  if (value !== null) {
    if (params.has(param)) {
      params.set(param, String(value));
    } else {
      params.append(param, String(value));
    }
  } else {
    if (params.has(param)) {
      params.delete(param);
    }
  }
  url.search = params.toString();
  window.history.pushState(null, '', url.toString());
}

function App(): React$Node {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const setOption = useCallback((setting: SettingName, value: boolean) => {
    setSettings((options) => ({
      ...options,
      [(setting: string)]: value,
    }));
    if (DEFAULT_SETTINGS[setting] === value) {
      setURLParam(setting, null);
    } else {
      setURLParam(setting, value);
    }
  }, []);

  return (
    <>
      <header>
        <img src="logo.svg" alt="Outline Logo" />
      </header>
      {settings.isRichText ? (
        settings.isCollab ? (
          <RichTextEditorWithCollaboration
            settings={settings}
            onSettingsChange={setOption}
          />
        ) : (
          <RichTextEditor settings={settings} onSettingsChange={setOption} />
        )
      ) : (
        <PlainTextEditor settings={settings} onSettingsChange={setOption} />
      )}
    </>
  );
}

export default App;