/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './fontSize.css';

import {LexicalEditor} from 'lexical';
import * as React from 'react';

import {
  MAX_ALLOWED_FONT_SIZE,
  MIN_ALLOWED_FONT_SIZE,
} from '../../context/ToolbarContext';
import {SHORTCUTS} from '../ShortcutsPlugin/shortcuts';
import {
  updateFontSize,
  updateFontSizeInSelection,
  UpdateFontSizeType,
} from './utils';

export function parseAllowedFontSize(input: string): string {
  const match = input.match(/^(\d+(?:\.\d+)?)px$/);
  if (match) {
    const n = Number(match[1]);
    if (n >= MIN_ALLOWED_FONT_SIZE && n <= MAX_ALLOWED_FONT_SIZE) {
      return input;
    }
  }
  return '';
}

export default function FontSize({
  selectionFontSize,
  disabled,
  editor,
}: {
  selectionFontSize: string;
  disabled: boolean;
  editor: LexicalEditor;
}) {
  const [inputValue, setInputValue] = React.useState<string>(selectionFontSize);
  const [inputChangeFlag, setInputChangeFlag] = React.useState<boolean>(false);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputValueNumber = Number(inputValue);

    if (e.key === 'Tab') {
      return;
    }
    if (['e', 'E', '+', '-'].includes(e.key) || isNaN(inputValueNumber)) {
      e.preventDefault();
      setInputValue('');
      return;
    }
    setInputChangeFlag(true);
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();

      updateFontSizeByInputValue(inputValueNumber);
    }
  };

  const handleInputBlur = () => {
    if (inputValue !== '' && inputChangeFlag) {
      const inputValueNumber = Number(inputValue);
      updateFontSizeByInputValue(inputValueNumber);
    }
  };

  const updateFontSizeByInputValue = (inputValueNumber: number) => {
    let updatedFontSize = inputValueNumber;
    if (inputValueNumber > MAX_ALLOWED_FONT_SIZE) {
      updatedFontSize = MAX_ALLOWED_FONT_SIZE;
    } else if (inputValueNumber < MIN_ALLOWED_FONT_SIZE) {
      updatedFontSize = MIN_ALLOWED_FONT_SIZE;
    }

    setInputValue(String(updatedFontSize));
    updateFontSizeInSelection(editor, String(updatedFontSize) + 'px', null);
    setInputChangeFlag(false);
  };

  React.useEffect(() => {
    setInputValue(selectionFontSize);
  }, [selectionFontSize]);

  return (
    <>
      <button
        type="button"
        disabled={
          disabled ||
          (selectionFontSize !== '' &&
            Number(inputValue) <= MIN_ALLOWED_FONT_SIZE)
        }
        onClick={() =>
          updateFontSize(editor, UpdateFontSizeType.decrement, inputValue)
        }
        className="toolbar-item font-decrement"
        aria-label="Decrease font size"
        title={`Decrease font size (${SHORTCUTS.DECREASE_FONT_SIZE})`}>
        <i className="format minus-icon" />
      </button>

      <input
        type="number"
        title="Font size"
        value={inputValue}
        disabled={disabled}
        className="toolbar-item font-size-input"
        min={MIN_ALLOWED_FONT_SIZE}
        max={MAX_ALLOWED_FONT_SIZE}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyPress}
        onBlur={handleInputBlur}
      />

      <button
        type="button"
        disabled={
          disabled ||
          (selectionFontSize !== '' &&
            Number(inputValue) >= MAX_ALLOWED_FONT_SIZE)
        }
        onClick={() =>
          updateFontSize(editor, UpdateFontSizeType.increment, inputValue)
        }
        className="toolbar-item font-increment"
        aria-label="Increase font size"
        title={`Increase font size (${SHORTCUTS.INCREASE_FONT_SIZE})`}>
        <i className="format add-icon" />
      </button>
    </>
  );
}
