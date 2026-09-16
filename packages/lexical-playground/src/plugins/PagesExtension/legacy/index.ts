/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $addUpdateTag,
  $createParagraphNode,
  $isRootNode,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
} from 'lexical';

import {$isPageContentNode, PageContentNode} from './PageContentNode';
import {$isPageNode, PageNode} from './PageNode';

export {
  $createPageContentNode,
  $isPageContentNode,
  PageContentNode,
} from './PageContentNode';
export {$createPageNode, $isPageNode, PageNode} from './PageNode';

/**
 * Older playground documents wrapped their content in
 * `PageNode > PageContentNode`. Pagination is now a pure presentation layer
 * over a flat document, so these transforms flatten any legacy page nodes
 * that arrive through JSON, the clipboard or collaboration back into their
 * parent. Nodes created by `parseEditorState`, `setEditorState` and
 * `$parseSerializedNode` are dirty, so this runs before the first
 * reconciliation of a loaded document and the legacy DOM is never rendered.
 */
export function registerLegacyPageUnwrap(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerNodeTransform(PageNode, page => {
      $addUpdateTag(HISTORY_MERGE_TAG);
      const parent = page.getParent();
      const children: LexicalNode[] = [];
      for (const child of page.getChildren()) {
        if ($isPageContentNode(child)) {
          children.push(...child.getChildren());
        } else {
          children.push(child);
        }
      }
      for (const child of children) {
        page.insertBefore(child);
      }
      page.remove();
      if ($isRootNode(parent) && parent.isEmpty()) {
        parent.append($createParagraphNode());
      }
    }),
    editor.registerNodeTransform(PageContentNode, content => {
      if ($isPageNode(content.getParent())) {
        // The PageNode transform unwraps both levels at once.
        return;
      }
      $addUpdateTag(HISTORY_MERGE_TAG);
      for (const child of content.getChildren()) {
        content.insertBefore(child);
      }
      content.remove();
    }),
  );
}
