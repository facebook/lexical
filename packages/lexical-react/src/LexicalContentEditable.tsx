/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';
import {useCallback, useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export type Props = {
  ariaActiveDescendant?: React.AriaAttributes['aria-activedescendant'];
  ariaAutoComplete?: React.AriaAttributes['aria-autocomplete'];
  ariaControls?: React.AriaAttributes['aria-controls'];
  ariaDescribedBy?: React.AriaAttributes['aria-describedby'];
  ariaExpanded?: React.AriaAttributes['aria-expanded'];
  ariaLabel?: React.AriaAttributes['aria-label'];
  ariaLabelledBy?: React.AriaAttributes['aria-labelledby'];
  ariaMultiline?: React.AriaAttributes['aria-multiline'];
  ariaOwns?: React.AriaAttributes['aria-owns'];
  ariaRequired?: React.AriaAttributes['aria-required'];
  autoCapitalize?: HTMLDivElement['autocapitalize'];
  'data-testid'?: string | null | undefined;
} & React.AllHTMLAttributes<HTMLDivElement>;

export function ContentEditable({
  ariaActiveDescendant,
  ariaAutoComplete,
  ariaControls,
  ariaDescribedBy,
  ariaExpanded,
  ariaLabel,
  ariaLabelledBy,
  ariaMultiline,
  ariaOwns,
  ariaRequired,
  autoCapitalize,
  className,
  id,
  role = 'textbox',
  spellCheck = true,
  style,
  tabIndex,
  'data-testid': testid,
  ...rest
}: Props): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isEditable, setEditable] = useState(false);

  const ref = useCallback(
    (rootElement: null | HTMLElement) => {
      // defaultView is required for a root element.
      // In multi-window setups, the defaultView may not exist at certain points.
      if (
        rootElement &&
        rootElement.ownerDocument &&
        rootElement.ownerDocument.defaultView
      ) {
        editor.setRootElement(rootElement);
      }
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
      {...rest}
      aria-activedescendant={!isEditable ? undefined : ariaActiveDescendant}
      aria-autocomplete={!isEditable ? 'none' : ariaAutoComplete}
      aria-controls={!isEditable ? undefined : ariaControls}
      aria-describedby={ariaDescribedBy}
      aria-expanded={
        !isEditable
          ? undefined
          : role === 'combobox'
          ? !!ariaExpanded
          : undefined
      }
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-multiline={ariaMultiline}
      aria-owns={!isEditable ? undefined : ariaOwns}
      aria-readonly={!isEditable ? true : undefined}
      aria-required={ariaRequired}
      autoCapitalize={autoCapitalize}
      className={className}
      contentEditable={isEditable}
      data-testid={testid}
      id={id}
      ref={ref}
      role={role}
      spellCheck={spellCheck}
      style={style}
      tabIndex={tabIndex}
    />
  );
}
