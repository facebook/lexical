/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  registerTableCellUnmergeTransform,
  registerTablePlugin,
  registerTableSelectionObserver,
  setScrollableTablesActive,
  TableCellNode,
} from '@lexical/table';
import {useEffect} from 'react';

export interface TablePluginProps {
  /**
   * When `false` (default `true`), merged cell support (colspan and rowspan) will be disabled and all
   * tables will be forced into a regular grid with 1x1 table cells.
   */
  hasCellMerge?: boolean;
  /**
   * When `false` (default `true`), the background color of TableCellNode will always be removed.
   */
  hasCellBackgroundColor?: boolean;
  /**
   * When `true` (default `true`), the tab key can be used to navigate table cells.
   */
  hasTabHandler?: boolean;
  /**
   * When `true` (default `false`), tables will be wrapped in a `<div>` to enable horizontal scrolling
   */
  hasHorizontalScroll?: boolean;
}

/**
 * A plugin to enable all of the features of Lexical's TableNode.
 *
 * @param props - See type for documentation
 * @returns An element to render in your LexicalComposer
 */
export function TablePlugin({
  hasCellMerge = true,
  hasCellBackgroundColor = true,
  hasTabHandler = true,
  hasHorizontalScroll = false,
}: TablePluginProps): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    setScrollableTablesActive(editor, hasHorizontalScroll);
  }, [editor, hasHorizontalScroll]);

  useEffect(() => registerTablePlugin(editor), [editor]);

  useEffect(
    () => registerTableSelectionObserver(editor, hasTabHandler),
    [editor, hasTabHandler],
  );

  // Unmerge cells when the feature isn't enabled
  useEffect(() => {
    if (!hasCellMerge) {
      return registerTableCellUnmergeTransform(editor);
    }
  }, [editor, hasCellMerge]);

  // Remove cell background color when feature is disabled
  useEffect(() => {
    if (hasCellBackgroundColor) {
      return;
    }
    return editor.registerNodeTransform(TableCellNode, (node) => {
      if (node.getBackgroundColor() !== null) {
        node.setBackgroundColor(null);
      }
    });
  }, [editor, hasCellBackgroundColor, hasCellMerge]);

  return null;
}
