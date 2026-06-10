/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {$createParagraphNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {
  $createEquationNode,
  $isEquationNode,
  EquationNode,
} from '../../src/nodes/EquationNode';
import {PLAYGROUND_TRANSFORMERS} from '../../src/plugins/MarkdownTransformers';

describe('EquationNode markdown', () => {
  initializeUnitTest(
    testEnv => {
      it('exports inline equations with single dollar delimiters', () => {
        const {editor} = testEnv;
        editor.update(
          () => {
            const paragraph = $createParagraphNode();
            paragraph.append($createEquationNode('x^2', true));
            $getRoot().clear();
            $getRoot().append(paragraph);
          },
          {discrete: true},
        );

        let markdown = '';
        editor.read(() => {
          markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
        });

        expect(markdown).toBe('$x^2$');
      });

      it('exports block equations with double dollar fences', () => {
        const {editor} = testEnv;
        editor.update(
          () => {
            $getRoot().clear();
            $getRoot().append($createEquationNode('\\frac{a}{b}', false));
          },
          {discrete: true},
        );

        let markdown = '';
        editor.read(() => {
          markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
        });

        expect(markdown).toBe('$$\n\\frac{a}{b}\n$$');
      });

      it('imports double dollar fences as block equations', () => {
        const {editor} = testEnv;
        editor.update(
          () => {
            $getRoot().clear();
            $convertFromMarkdownString(
              '$$\n\\frac{a}{b}\n$$',
              PLAYGROUND_TRANSFORMERS,
            );
          },
          {discrete: true},
        );

        editor.read(() => {
          const node = $getRoot().getFirstChild();
          expect($isEquationNode(node)).toBe(true);
          expect((node as EquationNode).isInline()).toBe(false);
          expect((node as EquationNode).getEquation()).toBe('\\frac{a}{b}');
        });
      });

      it('round-trips block equations through markdown', () => {
        const {editor} = testEnv;
        const markdown = '$$\na^2 + b^2 = c^2\n$$';
        editor.update(
          () => {
            $getRoot().clear();
            $convertFromMarkdownString(markdown, PLAYGROUND_TRANSFORMERS);
          },
          {discrete: true},
        );

        let exported = '';
        editor.read(() => {
          exported = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS);
        });

        expect(exported).toBe(markdown);
      });
    },
    {
      namespace: 'test',
      nodes: [EquationNode],
      theme: {},
    },
  );
});
