/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$convertToMarkdownString} from '@lexical/markdown';
import {$createParagraphNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {$createEquationNode} from '../../src/nodes/EquationNode';
import {PLAYGROUND_TRANSFORMERS} from '../../src/plugins/MarkdownTransformers';

describe('Playground markdown equations', () => {
  initializeUnitTest((testEnv) => {
    it('exports block equations with double dollar markers', () => {
      const {editor} = testEnv;
      const equation = 'x^2 + y^2 = z^2';

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createEquationNode(equation, false));
          $getRoot().clear().append(paragraph);
        },
        {discrete: true},
      );

      const markdown = editor.read(() =>
        $convertToMarkdownString(PLAYGROUND_TRANSFORMERS),
      );

      expect(markdown).toBe(`$$${equation}$$`);
    });

    it('exports inline equations with single dollar markers', () => {
      const {editor} = testEnv;
      const equation = 'a^2 + b^2 = c^2';

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createEquationNode(equation, true));
          $getRoot().clear().append(paragraph);
        },
        {discrete: true},
      );

      const markdown = editor.read(() =>
        $convertToMarkdownString(PLAYGROUND_TRANSFORMERS),
      );

      expect(markdown).toBe(`$${equation}$`);
    });
  });
});
