/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {useCallback, useState} from 'react';

import Button from './Button';

type Props = {
  initialEquation?: string;
  onConfirm: (equation: string) => void;
};

export default function InsertVariableAlterer({
  onConfirm,
  initialEquation = '',
}: Props): JSX.Element {
  const [equation, setEquation] = useState<string>(initialEquation);

  const onClick = useCallback(() => {
    onConfirm(equation);
  }, [onConfirm, equation]);

  return (
    <>
      <div className="InsertVariableAlterer_defaultRow">Name </div>
      <div className="KatexEquationAlterer_centerRow">
        <input
          onChange={(event) => {
            setEquation(event.target.value);
          }}
          value={equation}
          className="KatexEquationAlterer_textArea"
        />
      </div>
      <div className="KatexEquationAlterer_dialogActions">
        <Button onClick={onClick}>Confirm</Button>
      </div>
    </>
  );
}
