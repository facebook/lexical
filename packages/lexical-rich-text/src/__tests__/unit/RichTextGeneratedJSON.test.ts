/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {type LexicalNode} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

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

describe('rich-text generated exportJSON', () => {
  initializeUnitTest(
    testEnv => {
      test('the generated exporter is installed', () => {
        // Guard against the agreement tests passing vacuously: with the
        // `generated` wiring dropped, both classes would walk — and still
        // agree. Registration installs the generated exporter as an own
        // prototype method, and only on the class that declared it.
        for (const [klass, installed] of [
          [HeadingNode, true],
          [QuoteNode, true],
          [WalkHeadingNode, false],
          [WalkQuoteNode, false],
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

      test('HeadingNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            expectSameJSON(new HeadingNode(), new WalkHeadingNode());
            const $configured = <T extends HeadingNode>(node: T) =>
              node
                .setDirection('rtl')
                .setIndent(2)
                .setFormat('center')
                .setTextFormat(1)
                .setTextStyle('color: red');
            expectSameJSON(
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
            expectSameJSON(new QuoteNode(), new WalkQuoteNode());
            // The shadowRoot flat state is appended by the dispatch rather
            // than the generated literal; it has to survive the composition.
            expectSameJSON(
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
