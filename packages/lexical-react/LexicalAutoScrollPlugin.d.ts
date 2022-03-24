/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$ReadOnly} from 'utility-types';
type Props = $ReadOnly<{
  scrollRef: { current: HTMLElement | null };
}>;
export default function LexicalAutoScrollPlugin(props: Props): null;
