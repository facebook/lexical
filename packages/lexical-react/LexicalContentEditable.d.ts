/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$ReadOnly} from 'utility-types';
export type Props = $ReadOnly<{
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
  readOnly?: boolean;
  role?: string;
  style?: StyleSheetList;
  spellCheck?: boolean;
  tabIndex?: number;
  testid?: string;
}>;
export default function LexicalContentEditable(
  props: Props,
): JSX.Element | null;
