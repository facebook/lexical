/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineExtension} from 'lexical';

import {StickyNode} from '../../nodes/StickyNode';

/**
 * Sticky notes float over the document, so only the main editor registers
 * them; nested editors (page headers and footers) leave them out and the
 * toolbar hides the item there.
 */
export const StickyExtension = defineExtension({
  name: '@lexical/playground/Sticky',
  nodes: [StickyNode],
});
