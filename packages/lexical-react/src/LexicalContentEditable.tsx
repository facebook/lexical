/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';
import {CSSProperties, useCallback, useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export type Props = Readonly<{
  ariaActiveDescendantID?: string;
  ariaAutoComplete?: string;
  ariaControls?: string;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaMultiline?: boolean;
  ariaOwneeID?: string;
  ariaRequired?: string;
  autoCapitalize?: boolean;
  autoComplete?: boolean;
  autoCorrect?: boolean;
  className?: string;
  id?: string;
  readOnly?: boolean;
  role?: string;
  spellCheck?: boolean;
  style?: CSSProperties;
  tabIndex?: number;
  testid?: string;
}>;

export function ContentEditable({
  ariaActiveDescendantID,
  ariaAutoComplete,
  ariaControls,
  ariaDescribedBy,
  ariaExpanded,
  ariaLabel,
  ariaLabelledBy,
  ariaMultiline,
  ariaOwneeID,
  ariaRequired,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  className,
  id,
  role = 'textbox',
  spellCheck = true,
  style,
  tabIndex,
  testid,
}: Props): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isEditable, setEditable] = useState(false);

  const ref = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
    },
    [editor],
  );

  useLayoutEffect(() => {
    setEditable(editor.isEditable());
    return editor.registerEditableListener((currentIsEditable) => {
      setEditable(currentIsEditable);
    });
  }, [editor]);

  return (
    <div
      aria-activedescendant={!isEditable ? null : ariaActiveDescendantID}
      aria-autocomplete={!isEditable ? null : ariaAutoComplete}
      aria-controls={!isEditable ? null : ariaControls}
      aria-describedby={ariaDescribedBy}
      aria-expanded={
        !isEditable ? null : role === 'combobox' ? !!ariaExpanded : null
      }
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-multiline={ariaMultiline}
      aria-owns={!isEditable ? null : ariaOwneeID}
      aria-required={ariaRequired}
      autoCapitalize={
        autoCapitalize !== undefined ? String(autoCapitalize) : undefined
      }
      // @ts-ignore This is a valid attribute
      autoComplete={autoComplete}
      autoCorrect={autoCorrect !== undefined ? String(autoCorrect) : undefined}
      className={className}
      contentEditable={isEditable}
      data-testid={testid}
      id={id}
      ref={ref}
      role={!isEditable ? undefined : role}
      spellCheck={spellCheck}
      style={style}
      tabIndex={tabIndex}
    />
  );
}
