/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';

export type Props = $ReadOnly<{
  ariaActiveDescendantID?: string,
  ariaAutoComplete?: string,
  ariaControls?: string,
  ariaDescribedBy?: string,
  ariaExpanded?: boolean,
  ariaLabel?: string,
  ariaLabelledBy?: string,
  ariaMultiline?: boolean,
  ariaOwneeID?: string,
  ariaRequired?: string,
  autoCapitalize?: boolean,
  autoComplete?: boolean,
  autoCorrect?: boolean,
  className?: string,
  contentEditableRef: (null | HTMLElement) => void,
  readOnly?: boolean,
  role?: string,
  spellCheck?: boolean,
  tabIndex?: number,
  testid?: string,
}>;

export default function OutlineComposerContentEditable({
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
  contentEditableRef,
  readOnly = false,
  role = 'textbox',
  spellCheck = false,
  tabIndex,
  testid,
}: Props): React.MixedElement {
  return (
    <div
      aria-activedescendant={readOnly ? null : ariaActiveDescendantID}
      aria-autocomplete={readOnly ? null : ariaAutoComplete}
      aria-controls={readOnly ? null : ariaControls}
      aria-describedby={ariaDescribedBy}
      aria-expanded={
        readOnly ? null : role === 'combobox' ? !!ariaExpanded : null
      }
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-multiline={ariaMultiline}
      aria-owns={readOnly ? null : ariaOwneeID}
      aria-required={ariaRequired}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      autoCorrect={autoCorrect}
      className={className}
      contentEditable={!readOnly}
      data-testid={testid}
      ref={contentEditableRef}
      role={readOnly ? null : role}
      spellCheck={spellCheck}
      tabIndex={tabIndex}
    />
  );
}
