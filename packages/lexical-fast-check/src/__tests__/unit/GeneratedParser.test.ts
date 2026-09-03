/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {nodeArbitrary} from '@lexical/fast-check';
import * as fc from 'fast-check';
import {$getRoot, createEditor, TextNode} from 'lexical';
import {describe, expect, test} from 'vitest';

/**
 * A TextNode with its own type and nothing else. Its serialization schema
 * is the one it inherits, so the walk parses it exactly as it parses a
 * TextNode — but the
 * generated code is keyed by type, so this one never reaches it. That is the
 * control arm: the same schema, applied the other way.
 */
class WalkTextNode extends TextNode {
  $config() {
    return this.config('walk-text', {extends: TextNode});
  }
}

/** The five fields TextNode's schema describes, however they were written. */
function readFields(node: TextNode): {[key: string]: unknown} {
  return {
    detail: node.__detail,
    format: node.__format,
    mode: node.__mode,
    style: node.__style,
    text: node.__text,
  };
}

describe('the generated TextNode parser', () => {
  test('agrees with the schema-driven walk on everything the schema admits', () => {
    // The import direction is the untrusted-JSON boundary, so agreeing on a
    // handful of examples is not enough. `nodeArbitrary` builds values from the
    // very schema the walk parses — every legacy spelling, every enum member,
    // and each property independently present or absent — and the two have to
    // land on the same five fields for all of them.
    const editor = createEditor({
      namespace: '',
      nodes: [WalkTextNode],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot().clear();
        fc.assert(
          fc.property(nodeArbitrary(TextNode), json => {
            // Typed as what TextNode's updateFromJSON accepts, so no cast.
            const viaGenerated = new TextNode('');
            viaGenerated.updateFromJSON(json);
            const viaWalk = new WalkTextNode('');
            viaWalk.updateFromJSON(json);
            expect(readFields(viaGenerated)).toEqual(readFields(viaWalk));
          }),
          {numRuns: 1000},
        );
      },
      {discrete: true},
    );
  });

  test('the control arm really is the walk', () => {
    // If WalkTextNode picked up the generated code after all, the property
    // above would be comparing it against itself and could never fail.
    expect(WalkTextNode.getType()).toBe('walk-text');
    expect(TextNode.getType()).toBe('text');
  });
});
