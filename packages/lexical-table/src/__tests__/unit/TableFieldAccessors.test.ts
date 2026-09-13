/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {TableNode} from '@lexical/table';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

/**
 * A subclass whose frozen-count setters clamp, to hold the field declarations
 * to the accessors they stand in for.
 *
 * `frozenColumnCount` and `frozenRowCount` read and write their fields
 * directly, which is the fast path, but a field only ever *stands in for* an
 * accessor. Theirs are `setFrozenColumns` and `setFrozenRows`, not the
 * conventional `setFrozenColumnCount`/`setFrozenRowCount` a field would
 * otherwise assume, so the declarations name them: without that, importing
 * into a subclass that clamps wrote the raw count past its override.
 */
class CappedTableNode extends TableNode {
  static getType(): string {
    return 'capped-table';
  }
  static clone(node: CappedTableNode): CappedTableNode {
    return new CappedTableNode(node.__key);
  }
  setFrozenColumns(count: number): this {
    return super.setFrozenColumns(Math.min(count, 2));
  }
  setFrozenRows(count: number): this {
    return super.setFrozenRows(Math.min(count, 3));
  }
}

describe('the fields the frozen counts stand in for', () => {
  initializeUnitTest(
    testEnv => {
      test('a subclass override of either setter still decides', () => {
        testEnv.editor.update(
          () => {
            const node = CappedTableNode.importJSON({
              children: [],
              direction: null,
              format: '',
              frozenColumnCount: 9,
              frozenRowCount: 9,
              indent: 0,
              type: 'capped-table',
              version: 1,
            } as never) as CappedTableNode;
            expect(node.getFrozenColumns()).toBe(2);
            expect(node.getFrozenRows()).toBe(3);
          },
          {discrete: true},
        );
      });
    },
    {
      namespace: 'test',
      nodes: [TableNode, CappedTableNode],
      theme: {},
    },
  );
});
