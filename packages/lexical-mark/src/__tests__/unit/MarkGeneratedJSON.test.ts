/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {MarkNode} from '@lexical/mark';
import {type LexicalNode} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

// The control class: same schema (inherited through the config chain), same
// fields, but no `generated` in its own $config, so it exports through the
// schema-driven walk — which is exactly what the generated code has to agree
// with. Only the type string differs, by construction.
class WalkMarkNode extends MarkNode {
  $config() {
    return this.config('walk-mark', {extends: MarkNode});
  }
}

function expectSameJSON(generated: LexicalNode, walked: LexicalNode): void {
  // Both forms: each is generated separately, so each has to agree with the
  // walk separately.
  for (const compact of [false, true]) {
    const fromGenerated = generated.exportJSON(compact) as unknown as {
      [key: string]: unknown;
    };
    const fromWalk = walked.exportJSON(compact) as unknown as {
      [key: string]: unknown;
    };
    expect({compact, json: {...fromGenerated, type: null}}).toEqual({
      compact,
      json: {...fromWalk, type: null},
    });
    // Key order too: a document round-tripped through JSON.stringify should
    // not reorder depending on which implementation exported it.
    expect(Object.keys(fromGenerated)).toEqual(Object.keys(fromWalk));
  }
}

describe('mark generated exportJSON', () => {
  initializeUnitTest(
    testEnv => {
      test('the generated exporter is installed', () => {
        // Guard against the agreement tests passing vacuously: with the
        // `generated` wiring dropped, both classes would walk — and still
        // agree. Registration installs the generated exporter as an own
        // prototype method, and only on the class that declared it.
        for (const [klass, installed] of [
          [MarkNode, true],
          [WalkMarkNode, false],
        ] as const) {
          expect({
            installed: Object.prototype.hasOwnProperty.call(
              klass.prototype,
              'exportJSON',
            ),
            klass: klass.name,
          }).toEqual({installed, klass: klass.name});
        }
      });

      test('MarkNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            expectSameJSON(new MarkNode(), new WalkMarkNode());
            expectSameJSON(new MarkNode([]), new WalkMarkNode([]));
            expectSameJSON(
              new MarkNode(['a', 'b']),
              new WalkMarkNode(['a', 'b']),
            );
          },
          {discrete: true},
        );
      });

      test('the compact form compares ids through the schema equality', () => {
        // MarkNode's generated code is a factory precisely for this property:
        // `ids` defaults to an array, which no emitted literal could ever be
        // `===`, so the comparison closes over the schema's own defaultValue
        // and isEqual. `getIDs()` also copies, so even the identical-default
        // node never hands back the default by reference — both cases below
        // are decided by the closed-over equality, not by `===`.
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
