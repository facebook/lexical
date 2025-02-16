/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import * as React from 'react';
import {forwardRef, Ref, useCallback, useMemo, useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

import {mergeRefs} from './mergeRefs';

export type Props = {
  editor: LexicalEditor;
  ariaActiveDescendant?: React.AriaAttributes['aria-activedescendant'];
  ariaAutoComplete?: React.AriaAttributes['aria-autocomplete'];
  ariaControls?: React.AriaAttributes['aria-controls'];
  ariaDescribedBy?: React.AriaAttributes['aria-describedby'];
  ariaErrorMessage?: React.AriaAttributes['aria-errormessage'];
  ariaExpanded?: React.AriaAttributes['aria-expanded'];
  ariaInvalid?: React.AriaAttributes['aria-invalid'];
  ariaLabel?: React.AriaAttributes['aria-label'];
  ariaLabelledBy?: React.AriaAttributes['aria-labelledby'];
  ariaMultiline?: React.AriaAttributes['aria-multiline'];
  ariaOwns?: React.AriaAttributes['aria-owns'];
  ariaRequired?: React.AriaAttributes['aria-required'];
  autoCapitalize?: HTMLDivElement['autocapitalize'];
  'data-testid'?: string | null | undefined;
} & Omit<React.AllHTMLAttributes<HTMLDivElement>, 'placeholder'>;

function ContentEditableElementImpl(
  {
    editor,
    ariaActiveDescendant,
    ariaAutoComplete,
    ariaControls,
    ariaDescribedBy,
    ariaErrorMessage,
    ariaExpanded,
    ariaInvalid,
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
  }: Props,
  ref: Ref<HTMLDivElement>,
): JSX.Element {
  const [isEditable, setEditable] = useState(editor.isEditable());

  const handleRef = useCallback(
    (rootElement: null | HTMLElement) => {
      // defaultView is required for a root element.
      // In multi-window setups, the defaultView may not exist at certain points.
      if (
        rootElement &&
        rootElement.ownerDocument &&
        rootElement.ownerDocument.defaultView
      ) {
        editor.setRootElement(rootElement);
      } else {
        editor.setRootElement(null);
      }
    },
    [editor],
  );
  const mergedRefs = useMemo(() => mergeRefs(ref, handleRef), [handleRef, ref]);

  useLayoutEffect(() => {
    setEditable(editor.isEditable());
    return editor.registerEditableListener((currentIsEditable) => {
      setEditable(currentIsEditable);
    });
  }, [editor]);

  return (
    <div
      aria-activedescendant={isEditable ? ariaActiveDescendant : undefined}
      aria-autocomplete={isEditable ? ariaAutoComplete : 'none'}
      aria-controls={isEditable ? ariaControls : undefined}
      aria-describedby={ariaDescribedBy}
      // for compat, only override aria-errormessage if ariaErrorMessage is defined
      {...(ariaErrorMessage != null
        ? {'aria-errormessage': ariaErrorMessage}
        : {})}
      aria-expanded={
        isEditable && role === 'combobox' ? !!ariaExpanded : undefined
      }
      // for compat, only override aria-invalid if ariaInvalid is defined
      {...(ariaInvalid != null ? {'aria-invalid': ariaInvalid} : {})}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-multiline={ariaMultiline}
      aria-owns={isEditable ? ariaOwns : undefined}
      aria-readonly={isEditable ? undefined : true}
      aria-required={ariaRequired}
      autoCapitalize={autoCapitalize}
      className={className}
      contentEditable={isEditable}
      data-testid={testid}
      id={id}
      ref={mergedRefs}
      role={isEditable ? role : undefined}
      spellCheck={spellCheck}
      style={style}
      tabIndex={tabIndex}
      {...rest}
    />
  );
}

export const ContentEditableElement = forwardRef(ContentEditableElementImpl);
