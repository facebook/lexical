// @flow strict-local

import * as React from 'react';
import {useState, useMemo} from 'react';
import Switch from './Switch';

export type Options = {
  measureTypingPerf: boolean,
  isRichText: boolean,
  isCharLimit: boolean,
  isAutocomplete: boolean,
  showTreeView: boolean,
  showOptions: boolean,
};

function useOptions(
  initialOptions: Options,
): [React$Node, React$Node, Options] {
  const [showOptions, setShowOptions] = useState(initialOptions.showOptions);
  const [measureTypingPerf, setMeasureTypingPerf] = useState(
    initialOptions.measureTypingPerf,
  );
  const [isRichText, setRichText] = useState(initialOptions.isRichText);
  const [isCharLimit, setCharLimit] = useState(initialOptions.isCharLimit);
  const [isAutocomplete, setAutocomplete] = useState(
    initialOptions.isAutocomplete,
  );
  const [showTreeView, setShowTreeView] = useState(initialOptions.showTreeView);

  const button = (
    <button
      id="options-button"
      className="editor-dev-button"
      onClick={() => setShowOptions(!showOptions)}></button>
  );

  const switches = showOptions ? (
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
  ) : null;

  const options: Options = useMemo(
    () => ({
      measureTypingPerf,
      isRichText,
      isCharLimit,
      isAutocomplete,
      showTreeView,
      showOptions,
    }),
    [
      measureTypingPerf,
      isRichText,
      isCharLimit,
      isAutocomplete,
      showTreeView,
      showOptions,
    ],
  );

  return [button, switches, options];
}

export default useOptions;
