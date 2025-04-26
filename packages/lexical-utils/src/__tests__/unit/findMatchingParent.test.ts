/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  INTERNAL_$isBlock,
} from 'lexical';

describe('$findMatchingParent()', () => {
  it('returns the nearest block ancestor', async () => {
    const editor = createEditor();

    await editor.update(() => {
      // Build a miniature tree:  <p>hello</p>
      const p = $createParagraphNode();
      const txt = $createTextNode('hello');
      p.append(txt);
      $getRoot().append(p);

      // The helper should climb from <text> to that <p>
      const result = $findMatchingParent(txt, INTERNAL_$isBlock);

      expect(result).toBe(p);
    });
  });
});
