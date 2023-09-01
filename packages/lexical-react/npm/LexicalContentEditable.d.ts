/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as React from 'react';
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
export declare function ContentEditable({ ariaActiveDescendant, ariaAutoComplete, ariaControls, ariaDescribedBy, ariaExpanded, ariaLabel, ariaLabelledBy, ariaMultiline, ariaOwns, ariaRequired, autoCapitalize, className, id, role, spellCheck, style, tabIndex, 'data-testid': testid, ...rest }: Props): JSX.Element;
