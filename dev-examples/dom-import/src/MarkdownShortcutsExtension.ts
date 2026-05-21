/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/extension';
import {
  type ElementTransformer,
  registerMarkdownShortcuts,
  TRANSFORMERS,
} from '@lexical/markdown';
import {defineExtension, type LexicalNode} from 'lexical';

const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => ($isHorizontalRuleNode(node) ? '***' : null),
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }
    line.selectNext();
  },
  triggerOnEnter: true,
  type: 'element',
};

/**
 * Registers Markdown shortcuts (`# `, `**bold**`, `1. `, `- [ ] `, etc.)
 * using the default `TRANSFORMERS` plus a horizontal-rule transformer.
 * Mirrors what `MarkdownShortcutPlugin` does but as a self-contained
 * Lexical extension so the editor config stays composable.
 */
export const MarkdownShortcutsExtension = defineExtension({
  name: '@lexical/examples/dom-import/MarkdownShortcuts',
  register: editor => registerMarkdownShortcuts(editor, [HR, ...TRANSFORMERS]),
});
