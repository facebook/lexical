/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLineBreakNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {beforeAll, describe, expect, it, vi} from 'vitest';

import {registerCodeGutter} from '../../CodeGutter';
import {$createCodeHighlightNode} from '../../CodeHighlightNode';
import {$createCodeNode} from '../../CodeNode';

// jsdom does not implement ResizeObserver. The gutter helper instantiates
// one when word-wrap is enabled, so provide a no-op mock with disconnect
// tracking so we can assert teardown.
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }
}

beforeAll(() => {
  // Stub the missing global so word-wrap mode can instantiate one.
  (globalThis as {ResizeObserver: typeof ResizeObserver}).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
  // jsdom's Range does not implement getClientRects, which
  // syncGutterHeights() needs. Stub it so the helper can run.
  if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
    Range.prototype.getClientRects = function () {
      return [] as unknown as DOMRectList;
    };
  }
});

describe('CodeGutter', () => {
  initializeUnitTest(testEnv => {
    it('writes line numbers into data-gutter in classic (no word-wrap) mode', () => {
      const {editor} = testEnv;
      const cleanup = registerCodeGutter(editor);

      try {
        editor.update(
          () => {
            const codeNode = $createCodeNode('javascript');
            codeNode.append(
              $createCodeHighlightNode('one'),
              $createLineBreakNode(),
              $createCodeHighlightNode('two'),
              $createLineBreakNode(),
              $createCodeHighlightNode('three'),
            );
            $getRoot().append(codeNode);
          },
          {discrete: true},
        );

        const codeEl = testEnv.container.querySelector('code');
        expect(codeEl).not.toBeNull();
        expect(codeEl!.getAttribute('data-gutter')).toBe('1\n2\n3');
        // Classic mode renders no real `.code-gutter` element.
        expect(codeEl!.querySelector('.code-gutter')).toBeNull();
      } finally {
        cleanup();
      }
    });

    it('populates .code-gutter spans and observes content in word-wrap mode', () => {
      const {editor} = testEnv;
      MockResizeObserver.instances = [];
      const cleanup = registerCodeGutter(editor);

      try {
        editor.update(
          () => {
            const codeNode = $createCodeNode('javascript');
            codeNode.setWordWrap(true);
            codeNode.append(
              $createCodeHighlightNode('alpha'),
              $createLineBreakNode(),
              $createCodeHighlightNode('beta'),
            );
            $getRoot().append(codeNode);
          },
          {discrete: true},
        );

        const codeEl = testEnv.container.querySelector('code');
        expect(codeEl).not.toBeNull();
        expect(codeEl!.getAttribute('data-word-wrap')).toBe('true');
        const gutterEl = codeEl!.querySelector('.code-gutter')!;
        expect(gutterEl).not.toBeNull();
        expect(gutterEl.children.length).toBe(2);
        expect(gutterEl.children[0].textContent).toBe('1');
        expect(gutterEl.children[1].textContent).toBe('2');

        // The helper must have wired a ResizeObserver to the
        // .code-content element so wrapped-line heights stay in sync.
        expect(MockResizeObserver.instances.length).toBe(1);
        expect(MockResizeObserver.instances[0].observe).toHaveBeenCalledTimes(
          1,
        );
      } finally {
        cleanup();
      }
    });

    it('disconnects observers and removes the listener on cleanup', () => {
      const {editor} = testEnv;
      MockResizeObserver.instances = [];
      const cleanup = registerCodeGutter(editor);

      editor.update(
        () => {
          const codeNode = $createCodeNode('javascript');
          codeNode.setWordWrap(true);
          codeNode.append($createCodeHighlightNode('only'));
          $getRoot().append(codeNode);
        },
        {discrete: true},
      );

      expect(MockResizeObserver.instances.length).toBe(1);
      const observer = MockResizeObserver.instances[0];

      cleanup();
      expect(observer.disconnect).toHaveBeenCalledTimes(1);

      // After teardown, further mutations must not throw and must not
      // create a new observer (the listener has been removed).
      MockResizeObserver.instances = [];
      editor.update(
        () => {
          const codeNode = $getRoot().getFirstChildOrThrow();
          codeNode.remove();
        },
        {discrete: true},
      );
      expect(MockResizeObserver.instances.length).toBe(0);
    });
  });
});
