/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {namedStores, storeToggle} from '@lexical/extension';
import {mergeRegister} from '@lexical/utils';
import {defineExtension, safeCast} from 'lexical';

import {TableRowNode} from '../LexicalTable';
import {TableCellNode} from './LexicalTableCellNode';
import {
  $isScrollableTablesActive,
  setScrollableTablesActive,
  TableNode,
} from './LexicalTableNode';
import {
  registerTableCellUnmergeTransform,
  registerTablePlugin,
  registerTableSelectionObserver,
} from './LexicalTablePluginHelpers';

export interface TableConfig {
  /**
   * When `false` (default `true`), merged cell support (colspan and rowspan) will be disabled and all
   * tables will be forced into a regular grid with 1x1 table cells.
   */
  hasCellMerge: boolean;
  /**
   * When `false` (default `true`), the background color of TableCellNode will always be removed.
   */
  hasCellBackgroundColor: boolean;
  /**
   * When `true` (default `true`), the tab key can be used to navigate table cells.
   */
  hasTabHandler: boolean;
  /**
   * When `true` (default `true`), tables will be wrapped in a `<div>` to enable horizontal scrolling
   */
  hasHorizontalScroll: boolean;
}

export const TableExtension = defineExtension({
  build(editor, config, state) {
    return namedStores(config);
  },
  config: safeCast<TableConfig>({
    hasCellBackgroundColor: true,
    hasCellMerge: true,
    hasHorizontalScroll: true,
    hasTabHandler: true,
  }),
  name: '@lexical/table/Table',
  nodes: [TableNode, TableRowNode, TableCellNode],
  register(editor, config, state) {
    const stores = state.getOutput();
    return mergeRegister(
      stores.hasHorizontalScroll.subscribe((hasHorizontalScroll) => {
        const hadHorizontalScroll = $isScrollableTablesActive(editor);
        if (hadHorizontalScroll !== hasHorizontalScroll) {
          setScrollableTablesActive(editor, hasHorizontalScroll);
          // Registering the transform has the side-effect of marking all existing
          // TableNodes as dirty. The handler is immediately unregistered.
          editor.registerNodeTransform(TableNode, () => {})();
        }
      }),
      registerTablePlugin(editor),
      storeToggle(
        stores.hasTabHandler,
        () => true,
        () =>
          registerTableSelectionObserver(editor, stores.hasTabHandler.get()),
      ),
      storeToggle(
        stores.hasCellMerge,
        (v) => !v,
        () => registerTableCellUnmergeTransform(editor),
      ),
      storeToggle(
        stores.hasCellBackgroundColor,
        (v) => !v,
        () =>
          editor.registerNodeTransform(TableCellNode, (node) => {
            if (node.getBackgroundColor() !== null) {
              node.setBackgroundColor(null);
            }
          }),
      ),
    );
  },
});
