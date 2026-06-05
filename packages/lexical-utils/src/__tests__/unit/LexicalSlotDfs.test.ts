/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  LexicalNode,
  NodeKey,
  ParagraphNode,
} from 'lexical';
import {
  $createTestShadowRootNode,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

import {$dfs, $reverseDfs} from '../..';

// Slots-first preorder traversal: the shape a slot-aware $dfs must produce.
function* slotAwareDfs(
  depth: number,
  node: LexicalNode,
): Iterable<{depth: number; key: NodeKey}> {
  yield {depth, key: node.getKey()};
  if ($isElementNode(node)) {
    const childDepth = depth + 1;
    for (const name of node.getSlotNames()) {
      const slot = node.getSlot(name);
      if (slot !== null) {
        yield* slotAwareDfs(childDepth, slot);
      }
    }
    for (const child of node.getChildren()) {
      yield* slotAwareDfs(childDepth, child);
    }
  }
}

// Right-to-left mirror: children in reverse, then slots in reverse.
function* reverseSlotAwareDfs(
  depth: number,
  node: LexicalNode,
): Iterable<{depth: number; key: NodeKey}> {
  yield {depth, key: node.getKey()};
  if ($isElementNode(node)) {
    const childDepth = depth + 1;
    const children = node.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      yield* reverseSlotAwareDfs(childDepth, children[i]);
    }
    const names = node.getSlotNames();
    for (let i = names.length - 1; i >= 0; i--) {
      const slot = node.getSlot(names[i]);
      if (slot !== null) {
        yield* reverseSlotAwareDfs(childDepth, slot);
      }
    }
  }
}

describe('named-slots: $dfs traversal', () => {
  initializeUnitTest(testEnv => {
    // host -> (slot title: shadow root -> para -> "Title") + (child body -> "Body")
    const keys: Record<string, NodeKey> = {};
    function $buildTree(): void {
      const host = $createParagraphNode();
      const title = $createTestShadowRootNode();
      const titlePara = $createParagraphNode();
      const titleText = $createTextNode('Title');
      titlePara.append(titleText);
      title.append(titlePara);
      const body = $createParagraphNode();
      const bodyText = $createTextNode('Body');
      body.append(bodyText);
      $getRoot().append(host);
      host.append(body);
      host.setSlot('title', title);
      keys.host = host.getKey();
      keys.title = title.getKey();
      keys.titlePara = titlePara.getKey();
      keys.titleText = titleText.getKey();
      keys.body = body.getKey();
      keys.bodyText = bodyText.getKey();
    }

    test('$dfs visits slot subtrees, slots-first, ahead of children', async () => {
      const {editor} = testEnv;
      await editor.update($buildTree);

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        const visited = $dfs(host).map(({depth, node}) => ({
          depth,
          key: node.getKey(),
        }));
        // depth is absolute from root: host(1) -> title slot subtree
        // (shadow root 2 -> para 3 -> text 4) -> body child subtree(2,3)
        expect(visited).toEqual([
          {depth: 1, key: keys.host},
          {depth: 2, key: keys.title},
          {depth: 3, key: keys.titlePara},
          {depth: 4, key: keys.titleText},
          {depth: 2, key: keys.body},
          {depth: 3, key: keys.bodyText},
        ]);
      });
    });

    test('$dfs slot traversal matches the reference slots-first walk', async () => {
      const {editor} = testEnv;
      await editor.update($buildTree);

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        const fromDfs = $dfs(host).map(({depth, node}) => ({
          depth,
          key: node.getKey(),
        }));
        // host sits at absolute depth 1 (direct child of root)
        const reference = [...slotAwareDfs(1, host)];
        expect(fromDfs).toEqual(reference);
      });
    });

    test('$reverseDfs visits slots-last, mirroring $dfs (#7112 invariant)', async () => {
      const {editor} = testEnv;
      await editor.update($buildTree);

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        const visited = $reverseDfs(host).map(({depth, node}) => ({
          depth,
          key: node.getKey(),
        }));
        // host(1) -> body child reverse(2,3) -> title slot reverse
        // (shadow root 2 -> para 3 -> text 4)
        expect(visited).toEqual([
          {depth: 1, key: keys.host},
          {depth: 2, key: keys.body},
          {depth: 3, key: keys.bodyText},
          {depth: 2, key: keys.title},
          {depth: 3, key: keys.titlePara},
          {depth: 4, key: keys.titleText},
        ]);
        // matches the reference right-to-left mirror
        expect(visited).toEqual([...reverseSlotAwareDfs(1, host)]);
      });
    });

    test('reconciler text cache includes slot text (RootNode.__cachedText)', async () => {
      const {editor} = testEnv;
      await editor.update($buildTree);

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const host = root.getFirstChild<ParagraphNode>()!;
        // the uncached element walk is slot-aware (slots-first)
        expect(host.getTextContent()).toBe('TitleBody');
        // RootNode.getTextContent() returns the reconciler-built cache,
        // which now folds slot text in slots-first, matching the walk.
        expect(root.getTextContent()).toBe('TitleBody');
      });
    });
  });
});
