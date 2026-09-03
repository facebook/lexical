/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$expectSameJSON, initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

import {GENERATED_QUOTE} from '../../LexicalRichTextGeneratedJSON';

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

      test('QuoteNode parses through its generated parser, flat state included', () => {
        // A class that carries flat NodeState still gets a parser: the walk
        // applies the state before handing the node to the generated code,
        // the mirror of how export appends it after the generated literal.
        expect(GENERATED_QUOTE.updateFromJSON).toBeDefined();
        testEnv.editor.update(
          () => {
            const json = {
              direction: 'rtl',
              format: 'center',
              indent: 2,
              shadowRoot: true,
              textFormat: 1,
              textStyle: 'color: red',
            } as never;
            const viaGenerated = new QuoteNode().updateFromJSON(json);
            const viaWalk = new WalkQuoteNode().updateFromJSON(json);
            expect(viaGenerated.isShadowRoot()).toBe(true);
            expect(viaGenerated.getIndent()).toBe(2);
            $expectSameJSON(viaGenerated, viaWalk);
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
