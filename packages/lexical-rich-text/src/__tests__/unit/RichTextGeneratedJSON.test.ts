/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$expectSameJSON, initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, test} from 'vitest';

// The control classes: same schema (inherited through the config chain), same
// fields, but no `generated` in their own $config, so they export through the
// schema-driven walk — which is exactly what the generated code has to agree
// with. Only the type string differs, by construction.
class WalkHeadingNode extends HeadingNode {
  $config() {
    return this.config('walk-heading', {extends: HeadingNode});
  }
}

class WalkQuoteNode extends QuoteNode {
  $config() {
    return this.config('walk-quote', {extends: QuoteNode});
  }
}

describe('rich-text generated exportJSON', () => {
  initializeUnitTest(
    testEnv => {
      test('HeadingNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            $expectSameJSON(new HeadingNode(), new WalkHeadingNode());
            const $configured = <T extends HeadingNode>(node: T) =>
              node
                .setDirection('rtl')
                .setIndent(2)
                .setFormat('center')
                .setTextFormat(1)
                .setTextStyle('color: red');
            $expectSameJSON(
              $configured(new HeadingNode('h3')),
              $configured(new WalkHeadingNode('h3')),
            );
          },
          {discrete: true},
        );
      });

      test('QuoteNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            $expectSameJSON(new QuoteNode(), new WalkQuoteNode());
            // The shadowRoot flat state is appended by the dispatch rather
            // than the generated literal; it has to survive the composition.
            $expectSameJSON(
              new QuoteNode().setIsShadowRoot(true),
              new WalkQuoteNode().setIsShadowRoot(true),
            );
          },
          {discrete: true},
        );
      });
    },
    {
      namespace: 'test',
      nodes: [HeadingNode, QuoteNode, WalkHeadingNode, WalkQuoteNode],
      theme: {},
    },
  );
});
