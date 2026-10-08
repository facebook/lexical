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
 *
 * `role` defaults to `textbox` while the editor is editable. While it is not
 * editable the default depends on whether the element can be named: a
 * non-editable editor with an `aria-label`/`aria-labelledby` is a read-only
 * form field and keeps `textbox`, while one with no accessible name renders
 * content rather than a widget and takes no role at all. The invariant is that
 * the element carries a widget role if and only if it can be named — an
 * unnamed widget role is an `aria-input-field-name` violation, and a name on a
 * roleless element is an `aria-prohibited-attr` one. Pass `role` explicitly to
 * override either default.
 *
 * Widget-only ARIA (`aria-autocomplete`, `aria-readonly`, `aria-multiline`,
 * `aria-required`, `aria-placeholder`, ...) is emitted only alongside a role,
 * in either spelling, since those attributes are `aria-allowed-attr`
 * violations without one.
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
    role,
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

  // The hyphenated `aria-*` attributes are the preferred spelling, so they win
  // over the camelCase aliases kept for backwards compatibility. Pulling them
  // out of `rest` is also what keeps them from bypassing the gating below —
  // `rest` is spread last, so anything left in it reaches the DOM unfiltered.
  const {
    'aria-activedescendant': ariaActiveDescendantAttr = ariaActiveDescendant,
    'aria-autocomplete': ariaAutoCompleteAttr = ariaAutoComplete,
    'aria-expanded': ariaExpandedAttr = ariaExpanded,
    'aria-label': ariaLabelAttr = ariaLabel,
    'aria-labelledby': ariaLabelledByAttr = ariaLabelledBy,
    'aria-multiline': ariaMultilineAttr = ariaMultiline,
    'aria-placeholder': ariaPlaceholderAttr,
    'aria-readonly': ariaReadOnlyAttr,
    'aria-required': ariaRequiredAttr = ariaRequired,
    title,
    ...htmlProps
  } = rest;

  // An accessible name needs content: `aria-label=""` names nothing, so it
  // cannot stand in for one. `title` can supply the name when no ARIA label
  // does, so a read-only editor named only by its tooltip is still a field.
  const hasAccessibleName = [ariaLabelAttr, ariaLabelledByAttr, title].some(
    value => typeof value === 'string' && value.trim() !== '',
  );
  // `textbox` is the default while the editor is editable. While it is not,
  // the default turns on whether the element can be named: a named read-only
  // editor is a form field and keeps the role (and every attribute it had
  // before), while an unnamed one is content and takes no role, since an
  // unnamed widget role is an `aria-input-field-name` violation and a name on
  // a roleless element is an `aria-prohibited-attr` one.
  const resolvedRole =
    role === undefined
      ? isEditable || hasAccessibleName
        ? 'textbox'
        : undefined
      : role;
  // Widget-only ARIA is an `aria-allowed-attr` violation without a widget
  // role, so dropping the role has to drop these with it.
  const hasWidgetRole = resolvedRole != null;

  return (
    <div
      aria-activedescendant={isEditable ? ariaActiveDescendantAttr : undefined}
      aria-autocomplete={
        isEditable ? ariaAutoCompleteAttr : hasWidgetRole ? 'none' : undefined
      }
      aria-controls={isEditable ? ariaControls : undefined}
      aria-describedby={ariaDescribedBy}
      // for compat, only override aria-errormessage if ariaErrorMessage is defined
      {...(ariaErrorMessage != null
        ? {'aria-errormessage': ariaErrorMessage}
        : {})}
      aria-expanded={
        // A combobox requires `aria-expanded` whether or not it is editable;
        // dropping it on a read-only one is an `aria-required-attr`
        // violation. The authored value is preserved rather than coerced:
        // `!!` turns the string "false" — which ARIA reads as false, and
        // which React's own type for this attribute allows — into `true`.
        resolvedRole === 'combobox'
          ? ariaExpandedAttr === 'false'
            ? false
            : !!ariaExpandedAttr
          : undefined
      }
      // for compat, only override aria-invalid if ariaInvalid is defined
      {...(ariaInvalid != null ? {'aria-invalid': ariaInvalid} : {})}
      aria-label={ariaLabelAttr}
      aria-labelledby={ariaLabelledByAttr}
      aria-multiline={hasWidgetRole ? ariaMultilineAttr : undefined}
      aria-owns={isEditable ? ariaOwns : undefined}
      aria-placeholder={hasWidgetRole ? ariaPlaceholderAttr : undefined}
      aria-readonly={
        hasWidgetRole
          ? (ariaReadOnlyAttr ?? (isEditable ? undefined : true))
          : undefined
      }
      aria-required={hasWidgetRole ? ariaRequiredAttr : undefined}
      autoCapitalize={autoCapitalize}
      className={className}
      contentEditable={isEditable}
      data-testid={testid}
      id={id}
      ref={mergedRefs}
      role={resolvedRole}
      spellCheck={spellCheck}
      style={style}
      tabIndex={tabIndex ?? (isEditable ? undefined : -1)}
      // Destructured above to read it as a possible accessible name, so it
      // needs putting back; `htmlProps` no longer carries it.
      title={title}
      {...htmlProps}
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
// Annotated by hand: React's forwardRef is not a Lexical factory, so the build
// does not annotate it, and an unannotated module-scope call pins the module
// into every bundle that imports it.
export const ContentEditableElement = /* @__PURE__ */ forwardRef(
  ContentEditableElementImpl,
);
