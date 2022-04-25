/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import './EquationEditor.css';

import React from 'react';

type BaseEquationEditorProps = {
  equation: string,
  inline: boolean,
  inputRef: {current: null | HTMLElement},
  setEquation: (string) => void,
};

export default function EquationEditor({
  equation,
  setEquation,
  inline,
  inputRef,
}: BaseEquationEditorProps): React$Node {
  const onChange = (event) => {
    setEquation(event.target.value);
  };

  const props = {
    equation,
    inputRef,
    onChange,
  };

  return inline ? (
    <InlineEquationEditor {...props} />
  ) : (
    <BlockEquationEditor {...props} />
  );
}

type EquationEditorImplProps = {
  equation: string,
  inputRef: {current: null | HTMLElement},
  onChange: (SyntheticInputEvent<HTMLInputElement>) => void,
};

function InlineEquationEditor({
  equation,
  onChange,
  inputRef,
}: EquationEditorImplProps): React$Node {
  return (
    <span className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">$</span>
      <input
        className="EquationEditor_inlineEditor"
        value={equation}
        onChange={onChange}
        autoFocus={true}
        ref={inputRef}
      />
      <span className="EquationEditor_dollarSign">$</span>
    </span>
  );
}

function BlockEquationEditor({
  equation,
  onChange,
  inputRef,
}: EquationEditorImplProps): React$Node {
  return (
    <div className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">{'$$\n'}</span>
      <textarea
        className="EquationEditor_blockEditor"
        value={equation}
        onChange={onChange}
        ref={inputRef}
      />
      <span className="EquationEditor_dollarSign">{'\n$$'}</span>
    </div>
  );
}
