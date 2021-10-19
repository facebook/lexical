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
import {useRichTextEditor, usePlainTextEditor} from './Editor';
import OutlineTreeView from 'outline-react/OutlineTreeView';
import useSettings from './useSettings';
import useTestRecorder from './useTestRecorder';
import useTypingPerfTracker from './useTypingPerfTracker';
import {DEFAULT_SETTINGS} from './appSettings';

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
        {settingsSwitches}
        {settingsButton}
        {testRecorderButton}
      </div>
    </>
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
        <OutlineTreeView className="tree-view-output" editor={editor} />
      )}
      <div className="editor-dev-toolbar">
        {settingsSwitches}
        {settingsButton}
      </div>
    </>
  );
}

// override default options with query parameters if any
const urlSearchParams = new URLSearchParams(window.location.search);
for (const param of Object.keys(DEFAULT_SETTINGS)) {
  if (urlSearchParams.has(param)) {
    try {
      const value = JSON.parse(urlSearchParams.get(param) ?? 'true');
      DEFAULT_SETTINGS[param] = Boolean(value);
    } catch (error) {
      console.warn(`Unable to parse query parameter "${param}"`);
    }
  }
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
  const setOption = useCallback(
    (setting: SettingName, value: boolean) => {
      setSettings((options) => ({
        ...settings,
        [(setting: string)]: value,
      }));
      if (DEFAULT_SETTINGS[setting] === value) {
        setURLParam(setting, null);
      } else {
        setURLParam(setting, value);
      }
    },
    [settings],
  );

  return (
    <>
      <header>
        <img src="logo.svg" alt="Outline Logo" />
      </header>
      {settings.isRichText ? (
        <RichTextEditor settings={settings} onSettingsChange={setOption} />
      ) : (
        <PlainTextEditor settings={settings} onSettingsChange={setOption} />
      )}
    </>
  );
}

export default App;


const events = [];
// document.addEventListener('keydown', e => events.push(e.type));
// document.addEventListener('keyup', e => events.push(e.type));
document.addEventListener('compositionstart', e => events.push(e.type));
document.addEventListener('input', e => events.push(e.type));
document.addEventListener('compositionupdate', e => events.push(e.type));
document.addEventListener('compositionend', e => events.push(e.type));

setTimeout(() => {
  console.log(events)
}, 5000)