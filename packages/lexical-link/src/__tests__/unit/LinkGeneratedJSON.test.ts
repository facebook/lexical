/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AutoLinkNode, LinkNode} from '@lexical/link';
import {type LexicalNode} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

// The control classes: same schema (inherited through the config chain), same
// fields, but no `generated` in their own $config, so they export through the
// schema-driven walk — which is exactly what the generated code has to agree
// with. Only the type string differs, by construction.
class WalkLinkNode extends LinkNode {
  $config() {
    return this.config('walk-link', {extends: LinkNode});
  }
}

class WalkAutoLinkNode extends AutoLinkNode {
  $config() {
    return this.config('walk-autolink', {extends: AutoLinkNode});
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

describe('link generated exportJSON', () => {
  initializeUnitTest(
    testEnv => {
      test('the generated exporter is installed', () => {
        // Guard against the agreement tests passing vacuously: with the
        // `generated` wiring dropped, both classes would walk — and still
        // agree. Registration installs the generated exporter as an own
        // prototype method, and only on the class that declared it.
        for (const [klass, installed] of [
          [LinkNode, true],
          [AutoLinkNode, true],
          [WalkLinkNode, false],
          [WalkAutoLinkNode, false],
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

      test('LinkNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            expectSameJSON(new LinkNode(), new WalkLinkNode());
            const attributes = {
              rel: 'noreferrer',
              target: '_blank',
              title: 'Example',
            };
            expectSameJSON(
              new LinkNode('https://example.com/', attributes).setIndent(1),
              new WalkLinkNode('https://example.com/', attributes).setIndent(1),
            );
          },
          {discrete: true},
        );
      });

      test('AutoLinkNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            expectSameJSON(new AutoLinkNode(), new WalkAutoLinkNode());
            const attributes = {isUnlinked: true, target: '_blank'};
            expectSameJSON(
              new AutoLinkNode('https://example.com/', attributes),
              new WalkAutoLinkNode('https://example.com/', attributes),
            );
          },
          {discrete: true},
        );
      });
    },
    {
      namespace: 'test',
      nodes: [LinkNode, AutoLinkNode, WalkLinkNode, WalkAutoLinkNode],
      theme: {},
    },
  );
});
