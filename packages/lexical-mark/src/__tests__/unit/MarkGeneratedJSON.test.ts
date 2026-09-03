/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {MarkNode} from '@lexical/mark';
import {$expectSameJSON, initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

import {GENERATED_MARK} from '../../LexicalMarkGeneratedJSON';

// The control class: same schema (inherited through the config chain), same
// fields, but no `generated` in its own $config, so it exports through the
// schema-driven walk — which is exactly what the generated code has to agree
// with. Only the type string differs, by construction.
class WalkMarkNode extends MarkNode {
  $config() {
    return this.config('walk-mark', {extends: MarkNode});
  }
}

describe('mark generated exportJSON', () => {
  initializeUnitTest(
    testEnv => {
      test('MarkNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            $expectSameJSON(new MarkNode(), new WalkMarkNode());
            $expectSameJSON(new MarkNode([]), new WalkMarkNode([]));
            $expectSameJSON(
              new MarkNode(['a', 'b']),
              new WalkMarkNode(['a', 'b']),
            );
          },
          {discrete: true},
        );
      });

      test('the compact form compares an empty-array default by content', () => {
        // `ids` defaults to an array, which no emitted literal could ever be
        // `===`, so the generated comparison is the length test arrayValue's
        // own equality reduces to for an empty default — verified against that
        // equality when it was generated. `getIDs()` also copies, so even the
        // identical-default node never hands back the default by reference;
        // both cases below are decided by content, not by `===`.
        expect(GENERATED_MARK.exportCompactJSON).toBeDefined();
        testEnv.editor.update(
          () => {
            expect(new MarkNode().exportJSON(true)).toEqual({
              children: [],
              type: 'mark',
            });
            expect(new MarkNode([]).exportJSON(true)).toEqual({
              children: [],
              type: 'mark',
            });
            expect(new MarkNode(['x']).exportJSON(true)).toEqual({
              children: [],
              ids: ['x'],
              type: 'mark',
            });
            // The legacy form writes it unconditionally either way.
            expect(new MarkNode().exportJSON().ids).toEqual([]);
          },
          {discrete: true},
        );
      });
    },
    {
      namespace: 'test',
      nodes: [MarkNode, WalkMarkNode],
      theme: {},
    },
  );
});
