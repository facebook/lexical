/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { CSSProperties } from 'react';
export declare type Props = Readonly<{
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
export declare function ContentEditable({ ariaActiveDescendantID, ariaAutoComplete, ariaControls, ariaDescribedBy, ariaExpanded, ariaLabel, ariaLabelledBy, ariaMultiline, ariaOwneeID, ariaRequired, autoCapitalize, autoComplete, autoCorrect, className, id, role, spellCheck, style, tabIndex, testid, }: Props): JSX.Element;
