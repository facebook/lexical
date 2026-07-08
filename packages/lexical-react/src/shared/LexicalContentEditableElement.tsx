/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import * as React from 'react';
import {
  type ForwardedRef,
  forwardRef,
  type JSX,
  type RefCallback,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {mergeRefs} from './mergeRefs';
import useLayoutEffect from './useLayoutEffect';

/**
 * Props for the {@link ContentEditableElement} component. In addition to an
 * `editor`, it accepts the standard `<div>` HTML attributes (except
 * `placeholder`), including the hyphenated `aria-*` attributes, which are the
 * preferred way to set ARIA properties. The camelCase `aria*` props (such as
 * `ariaLabel`) are also accepted but are retained only for backwards
 * compatibility.
 */
export type ContentEditableElementProps = {
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
  }: ContentEditableElementProps,
  ref: ForwardedRef<HTMLDivElement>,
): JSX.Element {
  const [isEditable, setEditable] = useState(editor.isEditable());

  const handleRef = useCallback<RefCallback<HTMLDivElement>>(
    rootElement => {
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
    return editor.registerEditableListener(currentIsEditable => {
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
      role={role}
      spellCheck={spellCheck}
      style={style}
      tabIndex={tabIndex}
      {...rest}
    />
  );
}

/**
 * A lower-level building block for the editor's editable `<div>`. It binds the
 * given `editor` to the rendered element via
 * {@link LexicalEditor.setRootElement}, reflects the editor's editable state on
 * the `contentEditable` attribute, and applies the provided ARIA and HTML
 * attributes. Prefer {@link ContentEditable}, which reads the editor from
 * context and adds placeholder support, unless you need this extra control.
 */
export const ContentEditableElement = forwardRef(ContentEditableElementImpl);
