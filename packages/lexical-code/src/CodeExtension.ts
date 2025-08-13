/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineExtension} from 'lexical';

import {CodeHighlightNode} from './CodeHighlightNode';
import {CodeNode} from './CodeNode';

/**
 * Add code blocks to the editor (syntax highlighting provided separately)
 */
export const CodeExtension = defineExtension({
  name: '@lexical/code',
  nodes: [CodeNode, CodeHighlightNode],
});
