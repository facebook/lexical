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
  $isTextNode,
  $withSerializationContext,
  type AnySerializationStateConfigPair,
  createEditor,
  type LexicalEditor,
  SerializationContextCompact,
  SerializationContextOverride,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type SerializedRootNode,
  type SerializedTextNode,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

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
        (
          node: import('lexical').LexicalNode,
          $next: () => SerializedLexicalNode,
        ) =>
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
        (
          node: import('lexical').LexicalNode,
          $next: () => SerializedLexicalNode,
        ) => {
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
        (
          node: import('lexical').LexicalNode,
          $next: () => SerializedLexicalNode,
        ) => ($isTextNode(node) ? null : $next()),
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
        (
          node: import('lexical').LexicalNode,
          $next: () => SerializedLexicalNode,
        ) =>
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

  test('an enhancement keeps recursion: spread preserves the children array', () => {
    const root = toJSON([
      [
        SerializationContextOverride,
        (
          node: import('lexical').LexicalNode,
          $next: () => SerializedLexicalNode,
        ) =>
          node.getType() === 'paragraph' ? {...$next(), extra: true} : $next(),
      ],
    ]);
    // {...$next()} copies the children array by reference, so the walk still
    // fills it with the live children
    expect(childrenOf(root)[0]).toMatchObject({extra: true});
    expect(textsOf(childrenOf(root)[0])).toEqual(['plain', 'bold']);
  });

  test('the context does not leak outside its callback', () => {
    toJSON([[SerializationContextCompact, true]]);
    expect(childrenOf(toJSON())[0].version).toBe(1);
  });
});
