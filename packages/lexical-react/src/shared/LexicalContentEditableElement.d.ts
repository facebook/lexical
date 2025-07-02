/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from 'lexical';
import * as React from 'react';
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
export declare const ContentEditableElement: React.ForwardRefExoticComponent<{
    editor: LexicalEditor;
    ariaActiveDescendant?: React.AriaAttributes["aria-activedescendant"];
    ariaAutoComplete?: React.AriaAttributes["aria-autocomplete"];
    ariaControls?: React.AriaAttributes["aria-controls"];
    ariaDescribedBy?: React.AriaAttributes["aria-describedby"];
    ariaErrorMessage?: React.AriaAttributes["aria-errormessage"];
    ariaExpanded?: React.AriaAttributes["aria-expanded"];
    ariaInvalid?: React.AriaAttributes["aria-invalid"];
    ariaLabel?: React.AriaAttributes["aria-label"];
    ariaLabelledBy?: React.AriaAttributes["aria-labelledby"];
    ariaMultiline?: React.AriaAttributes["aria-multiline"];
    ariaOwns?: React.AriaAttributes["aria-owns"];
    ariaRequired?: React.AriaAttributes["aria-required"];
    autoCapitalize?: HTMLDivElement["autocapitalize"];
    'data-testid'?: string | null | undefined;
} & Omit<React.AllHTMLAttributes<HTMLDivElement>, "placeholder"> & React.RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=LexicalContentEditableElement.d.ts.map