/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import './KatexEquationAlterer.css';

import * as React from 'react';
import {useCallback, useState} from 'react';

import Button from '../ui/Button';
import EquationEditor from './EquationEditor';

type Props = {
  initialEquation?: string;
  onConfirm: (equation: string, inline: boolean) => void;
};

export default function KatexEquationAlterer({
  onConfirm,
  initialEquation = '',
}: Props): JSX.Element {
  const [equation, setEquation] = useState<string>(initialEquation);
  const [inline, setInline] = useState<boolean>(true);

  const onClick = useCallback(() => {
    onConfirm(equation, inline);
  }, [onConfirm, equation, inline]);

  const onCheckboxChange = useCallback(() => {
    setInline(!inline);
  }, [setInline, inline]);

  return (
    <>
      <div className="KatexEquationAlterer_defaultRow">
        Inline
        <input
          type="checkbox"
          checked={inline}
          onChange={onCheckboxChange}
          data-test-id="equation-inline-checkbox"
        />
      </div>
      <div className="KatexEquationAlterer_centerRow">
        <EquationEditor
          equation={equation}
          inline={inline}
          setEquation={setEquation}
          showPreview={true}
        />
      </div>
      <div className="KatexEquationAlterer_dialogActions">
        <Button onClick={onClick} data-test-id="equation-submit-btn">
          Confirm
        </Button>
      </div>
    </>
  );
}
