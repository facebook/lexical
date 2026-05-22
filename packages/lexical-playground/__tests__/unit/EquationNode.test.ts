/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createParagraphNode, $getRoot} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {$createEquationNode, EquationNode} from '../../src/nodes/EquationNode';

describe('Issue #8534 follow-up: EquationNode.isInline on stale node ref', () => {
  it('does not throw when called on a detached node reference', () => {
    const editor = createTestEditor({
      nodes: [EquationNode],
      onError: error => {
        throw error;
      },
    });

    let equationRef: EquationNode | null = null;

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const equation = $createEquationNode('x^2', true);
        paragraph.append(equation);
        $getRoot().append(paragraph);
        equationRef = equation;
      },
      {discrete: true},
    );

    editor.update(
      () => {
        equationRef!.remove();
      },
      {discrete: true},
    );

    // After removal, the prev-state reference's __key is no longer in
    // the active node map. Calling isInline() on it must read __inline
    // directly instead of routing through getLatest() (which would
    // throw via invariant on null lookup).
    editor.read(() => {
      expect(() => equationRef!.isInline()).not.toThrow();
      expect(equationRef!.isInline()).toBe(true);
    });
  });
});
