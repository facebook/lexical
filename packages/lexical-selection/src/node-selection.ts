/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ICloneSelectionContent} from './lexical-node';
import type {NodeSelection} from 'lexical';

import invariant from 'shared/invariant';

export function $cloneNodeSelectionContent(
  selection: NodeSelection,
): ICloneSelectionContent {
  invariant(false, 'TODO');
}
