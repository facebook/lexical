/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  defineExtension,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTextNode,
  $setSlot,
  $withSerializationContext,
  type AnySerializationStateConfigPair,
  createEditor,
  type LexicalEditor,
  type LexicalNode,
  SerializationContextCompact,
  SerializationContextOverride,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type SerializedRootNode,
  type SerializedTextNode,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

import {
  $createTestDecoratorNode,
  $createTestShadowRootNode,
  TestDecoratorNode,
  TestShadowRootNode,
} from '../utils';

// The walk only ever produces elements where this is used, but serialized
// JSON carries no discriminator beyond `type`, so the shape is asserted here
// rather than at every call site.
function childrenOf(node: SerializedLexicalNode): SerializedLexicalNode[] {
  return (node as SerializedElementNode).children;
}

function textsOf(node: SerializedLexicalNode): (string | undefined)[] {
  return childrenOf(node).map(child => (child as SerializedTextNode).text);
}

describe('serialization context', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor({
      namespace: '',
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('plain'),
              $createTextNode('bold').setFormat('bold'),
            ),
          );
      },
      {discrete: true},
    );
  });

  function toJSON(
    pairs: readonly AnySerializationStateConfigPair[] = [],
  ): SerializedRootNode {
    return editor.read(() =>
      $withSerializationContext(pairs)(
        () => editor.getEditorState().toJSON().root,
      ),
    );
  }

  test('legacy is the default and is unchanged', () => {
    const root = toJSON();
    const paragraph = childrenOf(root)[0];
    const [plain, bold] = childrenOf(paragraph);
    // every property written out, including the deprecated `version`
    expect(root.version).toBe(1);
    expect(paragraph).toMatchObject({
      direction: null,
      format: '',
      indent: 0,
      type: 'paragraph',
      version: 1,
    });
    expect(plain).toMatchObject({
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
      text: 'plain',
      type: 'text',
      version: 1,
    });
    expect(bold).toMatchObject({format: 1, text: 'bold'});
  });

  test('compact omits version and every default-valued property', () => {
    const root = toJSON([[SerializationContextCompact, true]]);
    const paragraph = childrenOf(root)[0];
    const [plain, bold] = childrenOf(paragraph);
    expect(root).not.toHaveProperty('version');
    // a paragraph with no formatting keeps only its structure
    expect(Object.keys(paragraph).sort()).toEqual(['children', 'type']);
    // text keeps what differs from the default, drops the rest
    expect(plain).toEqual({text: 'plain', type: 'text'});
    expect(bold).toEqual({format: 1, text: 'bold', type: 'text'});
  });

  test('compact JSON parses back to the same document as legacy JSON', () => {
    const legacy = toJSON();
    const compact = toJSON([[SerializationContextCompact, true]]);
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(legacy).length,
    );

    const fromCompact = editor.parseEditorState({
      root: compact,
    } as never);
    const fromLegacy = editor.parseEditorState({root: legacy} as never);
    // both restore the same content, and re-exporting the compact-parsed state
    // in legacy form reproduces the original legacy JSON exactly
    for (const state of [fromCompact, fromLegacy]) {
      expect(
        state.read(() =>
          $getRoot()
            .getAllTextNodes()
            .map(n => [n.getTextContent(), n.getFormat()]),
        ),
      ).toEqual([
        ['plain', 0],
        ['bold', 1],
      ]);
    }
    expect(fromCompact.toJSON()).toEqual(fromLegacy.toJSON());
  });

  test('an override can omit a node and its subtree', () => {
    const root = toJSON([
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          $isTextNode(node) && node.getTextContent() === 'bold'
            ? null
            : $next(),
      ],
    ]);
    expect(textsOf(childrenOf(root)[0])).toEqual(['plain']);
  });

  test('an override can enhance what $next() produced', () => {
    const root = toJSON([
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) => {
          const json = $next();
          return $isTextNode(node) && node.getTextContent() === 'bold'
            ? {...json, text: 'REDACTED'}
            : json;
        },
      ],
    ]);
    expect(textsOf(childrenOf(root)[0])).toEqual(['plain', 'REDACTED']);
  });

  test('overrides and compaction compose', () => {
    const root = toJSON([
      [SerializationContextCompact, true],
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          $isTextNode(node) ? null : $next(),
      ],
    ]);
    // every text node omitted, and what survives is still compacted
    expect(root.type).toBe('root');
    expect(root).not.toHaveProperty('version');
    expect(childrenOf(childrenOf(root)[0])).toEqual([]);
  });

  test('the root cannot be omitted; an omission for it is ignored', () => {
    const root = toJSON([[SerializationContextOverride, () => null]]);
    // every other node was omitted, but the root exported normally
    expect(root.type).toBe('root');
    expect(root.children).toEqual([]);
  });

  test('a replacement is authoritative: live children are not appended', () => {
    const root = toJSON([
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          node.getType() === 'paragraph'
            ? {children: [], type: 'paragraph', version: 1}
            : $next(),
      ],
    ]);
    // the replacement said "no children" and the walk respected it — the
    // paragraph's real text is not leaked into the export
    expect(childrenOf(childrenOf(root)[0])).toEqual([]);
    expect(JSON.stringify(root)).not.toContain('plain');
  });

  test('an enhancement keeps recursion: spread carries $next() forward', () => {
    const root = toJSON([
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          node.getType() === 'paragraph' ? {...$next(), extra: true} : $next(),
      ],
    ]);
    // spreading $next() carries forward what marks it as this node's own
    // export, so the walk still fills it with the live children
    expect(childrenOf(root)[0]).toMatchObject({extra: true});
    expect(textsOf(childrenOf(root)[0])).toEqual(['plain', 'bold']);
  });

  test('the context does not leak outside its callback', () => {
    toJSON([[SerializationContextCompact, true]]);
    expect(childrenOf(toJSON())[0].version).toBe(1);
  });

  test('a same-type replacement is compacted, a foreign-type one is not', () => {
    // A TabNode's `text`, `detail` and `mode` are all derived, so compacting
    // this replacement with the tab's own table would strip a text node down
    // to {type: 'text'} and lose its content.
    const asText = toJSON([
      [SerializationContextCompact, true],
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          $isTextNode(node) && node.getTextContent() === 'plain'
            ? {detail: 2, mode: 'normal', text: '\t', type: 'tab', version: 1}
            : $next(),
      ],
    ]);
    expect(childrenOf(childrenOf(asText)[0])[0]).toEqual({
      detail: 2,
      mode: 'normal',
      text: '\t',
      type: 'tab',
      version: 1,
    });

    // A replacement that still describes this node's type is compacted like
    // any other export of it.
    const stillText = toJSON([
      [SerializationContextCompact, true],
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          $isTextNode(node) && node.getTextContent() === 'plain'
            ? {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'swapped',
                type: 'text',
                version: 1,
              }
            : $next(),
      ],
    ]);
    expect(childrenOf(childrenOf(stillText)[0])[0]).toEqual({
      text: 'swapped',
      type: 'text',
    });
  });

  test('the enhance/replace marker never reaches the exported JSON', () => {
    const root = toJSON([
      [
        SerializationContextOverride,
        (node: LexicalNode, $next: () => SerializedLexicalNode) =>
          node.getType() === 'paragraph' ? {...$next()} : $next(),
      ],
    ]);
    // symbol keys survive a spread, so an implementation detail carried on
    // $next()'s result could ride out with it — deep equality would see it
    for (const json of [root, childrenOf(root)[0]]) {
      expect(Object.getOwnPropertySymbols(json)).toEqual([]);
    }
    expect(root).toEqual(JSON.parse(JSON.stringify(root)));
  });
});

describe('serialization context: slot hosts', () => {
  function createHostEditor(): LexicalEditorWithDispose {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const host = $createTestDecoratorNode().setIsInline(false);
          const slot = $createTestShadowRootNode();
          slot.append($createParagraphNode().append($createTextNode('inside')));
          $getRoot().clear().append(host);
          $setSlot(host, 'body', slot);
        },
        name: '[serialization-slots]',
        nodes: [TestDecoratorNode, TestShadowRootNode],
      }),
    );
    return editor;
  }

  function slotsOf(node: SerializedLexicalNode) {
    return (node as SerializedLexicalNode & {$slots?: object}).$slots;
  }

  test('an enhancing override keeps the slots of a decorator host', () => {
    using editor = createHostEditor();
    const root = editor.read(() =>
      $withSerializationContext([
        [
          SerializationContextOverride,
          (node: LexicalNode, $next: () => SerializedLexicalNode) => ({
            ...$next(),
            seen: true,
          }),
        ],
      ])(() => editor.getEditorState().toJSON().root),
    );
    // a decorator host has no `children` array, so nothing about the result's
    // shape distinguishes an enhancement from a replacement — the walk still
    // owns the subtree, and the slot must survive
    const host = childrenOf(root)[0];
    expect(host).toMatchObject({seen: true, type: 'test_decorator'});
    expect(JSON.stringify(slotsOf(host))).toContain('inside');
  });

  test('a replacing override drops the slots it did not carry', () => {
    using editor = createHostEditor();
    const root = editor.read(() =>
      $withSerializationContext([
        [
          SerializationContextOverride,
          (node: LexicalNode, $next: () => SerializedLexicalNode) =>
            node.getType() === 'test_decorator'
              ? {type: 'test_decorator', version: 1}
              : $next(),
        ],
      ])(() => editor.getEditorState().toJSON().root),
    );
    // the replacement is authoritative: it carried no slots, so the host's
    // live slot subtree is not appended to it
    expect(childrenOf(root)[0]).toEqual({type: 'test_decorator', version: 1});
  });

  test('a host whose every slot was omitted writes no $slots at all', () => {
    using editor = createHostEditor();
    const root = editor.read(() =>
      $withSerializationContext([
        [
          SerializationContextOverride,
          (node: LexicalNode, $next: () => SerializedLexicalNode) =>
            node.getType() === 'test_shadow_root' ? null : $next(),
        ],
      ])(() => editor.getEditorState().toJSON().root),
    );
    // an empty `$slots` object would be bytes that parse back to nothing
    expect(slotsOf(childrenOf(root)[0])).toBeUndefined();
  });
});
