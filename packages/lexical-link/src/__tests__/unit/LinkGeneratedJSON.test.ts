/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AutoLinkNode, LinkNode} from '@lexical/link';
import {$expectSameJSON, initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, test} from 'vitest';

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

describe('link generated exportJSON', () => {
  initializeUnitTest(
    testEnv => {
      test('LinkNode agrees with the schema-driven walk', () => {
        testEnv.editor.update(
          () => {
            $expectSameJSON(new LinkNode(), new WalkLinkNode());
            const attributes = {
              rel: 'noreferrer',
              target: '_blank',
              title: 'Example',
            };
            $expectSameJSON(
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
            $expectSameJSON(new AutoLinkNode(), new WalkAutoLinkNode());
            const attributes = {isUnlinked: true, target: '_blank'};
            $expectSameJSON(
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
