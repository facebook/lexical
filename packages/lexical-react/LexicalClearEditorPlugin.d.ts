/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {$ReadOnly} from 'utility-types';
type Props = $ReadOnly<{
  onClear?: () => void;
}>;
export function ClearEditorPlugin(arg0: Props): JSX.Element | null;
