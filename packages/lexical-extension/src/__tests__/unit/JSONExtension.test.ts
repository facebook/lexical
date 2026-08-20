/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  configExtension,
  defineExtension,
  getExtensionDependencyFromEditor,
  type JSONConfig,
  JSONExtension,
  jsonOverride,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTextNode,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type SerializedRootNode,
  type SerializedTextNode,
  TextNode,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

function buildEditor(
  config: Partial<JSONConfig> = {},
): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions({
    dependencies: [configExtension(JSONExtension, config)],
    name: '[root]',
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
            // a distinct format keeps this from normalizing into its sibling
            $createTextNode('secret').setFormat('bold'),
          ),
        );
    },
    {discrete: true},
  );
  return editor;
}

function exportRoot(
  editor: LexicalEditorWithDispose,
  options?: {compact?: boolean},
): SerializedRootNode {
  const {$exportJSON} = getExtensionDependencyFromEditor(
    editor,
    JSONExtension,
  ).output;
  return editor.read(() => $exportJSON(undefined, options).root);
}

// The walk only ever produces elements where these are used, but serialized
// JSON carries no discriminator beyond `type`, so the shape is asserted here
// rather than at every call site.
function childrenOf(node: SerializedLexicalNode): SerializedLexicalNode[] {
  return (node as SerializedElementNode).children;
}

function texts(root: SerializedRootNode): (string | undefined)[] {
  return childrenOf(childrenOf(root)[0]).map(
    child => (child as SerializedTextNode).text,
  );
}

describe('JSONExtension', () => {
  test('defaults to the legacy form', () => {
    using editor = buildEditor();
    const root = exportRoot(editor);
    expect(root.version).toBe(1);
    expect(root.children[0]).toMatchObject({indent: 0, type: 'paragraph'});
  });

  test('config `compact` drops version and default-valued properties', () => {
    using editor = buildEditor({compact: true});
    const root = exportRoot(editor);
    expect(root).not.toHaveProperty('version');
    expect(Object.keys(root.children[0]).sort()).toEqual(['children', 'type']);
  });

  test('the per-call option wins over the configured default', () => {
    using compactEditor = buildEditor({compact: true});
    expect(exportRoot(compactEditor, {compact: false}).version).toBe(1);
    using legacyEditor = buildEditor();
    expect(exportRoot(legacyEditor, {compact: true})).not.toHaveProperty(
      'version',
    );
  });

  test('an override matched by node class omits matching nodes', () => {
    using editor = buildEditor({
      overrides: [jsonOverride([TextNode], {$exportJSON: () => null})],
    });
    expect(texts(exportRoot(editor))).toEqual([]);
  });

  test('an override matched by type guard can replace a node', () => {
    using editor = buildEditor({
      overrides: [
        jsonOverride([$isTextNode], {
          $exportJSON: (node, $next) =>
            node.getTextContent() === 'secret'
              ? {...$next(), text: 'REDACTED'}
              : $next(),
        }),
      ],
    });
    expect(texts(exportRoot(editor))).toEqual(['plain', 'REDACTED']);
  });

  test("'*' matches every node", () => {
    const seen: string[] = [];
    using editor = buildEditor({
      overrides: [
        jsonOverride('*', {
          $exportJSON: (node, $next) => {
            seen.push(node.getType());
            return $next();
          },
        }),
      ],
    });
    exportRoot(editor);
    expect(seen.sort()).toEqual(['paragraph', 'root', 'text', 'text']);
  });

  test('overrides chain through $next, first listed outermost', () => {
    const order: string[] = [];
    using editor = buildEditor({
      overrides: [
        jsonOverride([TextNode], {
          $exportJSON: (node, $next) => {
            order.push('outer');
            const inner = $next() as SerializedTextNode;
            return {...inner, text: `outer(${inner.text})`};
          },
        }),
        jsonOverride([TextNode], {
          $exportJSON: (node, $next) => {
            order.push('inner');
            return {...$next(), text: `inner`};
          },
        }),
      ],
    });
    const root = exportRoot(editor);
    // the chain is lazy: the first override runs, and its $next() call is what
    // invokes the second one
    expect(order.slice(0, 2)).toEqual(['outer', 'inner']);
    expect(texts(root)).toEqual(['outer(inner)', 'outer(inner)']);
  });

  test('a replacement without $next never runs lower layers or exportJSON', () => {
    class ThrowingTextNode extends TextNode {
      $config() {
        return this.config('throwing-text', {extends: TextNode});
      }
      exportJSON(): SerializedTextNode {
        throw new Error('cannot serialize');
      }
    }
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(JSONExtension, {
          overrides: [
            jsonOverride([ThrowingTextNode], {
              $exportJSON: node => ({
                text: node.getTextContent(),
                type: 'text',
                version: 1,
              }),
            }),
          ],
        }),
      ],
      name: '[root]',
      namespace: '',
      nodes: [ThrowingTextNode],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(new ThrowingTextNode('shielded')),
          );
      },
      {discrete: true},
    );
    // the override replaces the node without calling $next, so the throwing
    // exportJSON must never execute
    expect(texts(exportRoot(editor))).toEqual(['shielded']);
  });

  test('a lower-priority omission wins over a higher-priority enhancement', () => {
    using editor = buildEditor({
      overrides: [
        jsonOverride('*', {
          $exportJSON: (node, $next) => $next(),
        }),
        jsonOverride([$isTextNode], {
          $exportJSON: () => null,
        }),
      ],
    });
    expect(texts(exportRoot(editor))).toEqual([]);
  });

  test('overrides configured by independent extensions concatenate', () => {
    const marker = (name: string) =>
      configExtension(JSONExtension, {
        overrides: [
          jsonOverride([$isTextNode], {
            $exportJSON: (node, $next) => {
              const inner = $next() as SerializedTextNode;
              return {...inner, text: `${name}(${inner.text})`};
            },
          }),
        ],
      });
    using editor = buildEditorFromExtensions({
      dependencies: [
        defineExtension({dependencies: [marker('first')], name: 'first'}),
        defineExtension({dependencies: [marker('second')], name: 'second'}),
      ],
      name: '[root]',
      namespace: '',
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('plain')));
      },
      {discrete: true},
    );
    // both extensions' overrides run: the default shallow config merge would
    // have replaced the first extension's list with the second's
    expect(texts(exportRoot(editor))).toEqual(['first(second(plain))']);
  });

  test('an override reaches a nested editor', () => {
    // The export context is scoped to the export, not to an editor, so a
    // nested editor (an image caption, a sticky note) inherits it: a
    // redaction override cannot be bypassed by nesting. This also pins that
    // `editorState.toJSON()` — which runs with the active editor set to null —
    // still sees the context installed around it.
    using editor = buildEditor({
      overrides: [
        jsonOverride([$isTextNode], {
          $exportJSON: (node, $next) => {
            const inner = $next() as SerializedTextNode;
            return {...inner, text: 'REDACTED'};
          },
        }),
      ],
    });
    const nested = buildEditorFromExtensions({
      name: '[nested]',
      namespace: '',
      onError: err => {
        throw err;
      },
    });
    onTestFinished(() => nested.dispose());
    nested.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('SECRET')));
      },
      {discrete: true},
    );
    const {$withSerialization} = getExtensionDependencyFromEditor(
      editor,
      JSONExtension,
    ).output;
    const nestedJSON = editor.read(() =>
      $withSerialization(() =>
        JSON.stringify(nested.getEditorState().toJSON()),
      ),
    );
    expect(nestedJSON).not.toContain('SECRET');
    expect(nestedJSON).toContain('REDACTED');
  });

  test('compaction drops a property the parser derives rather than reads', () => {
    // ListNode's `tag` follows from `listType` on the way in (it declares
    // {setter: null}), so writing it in the compact form costs bytes nothing
    // will ever read.
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(JSONExtension, {compact: true}),
        ListExtension,
      ],
      name: '[root]',
      namespace: '',
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createListNode('bullet').append($createListItemNode()));
      },
      {discrete: true},
    );
    const {$exportJSON} = getExtensionDependencyFromEditor(
      editor,
      JSONExtension,
    ).output;
    const list = editor.read(
      () =>
        ($exportJSON().root as unknown as SerializedElementNode)
          .children[0] as unknown as Record<string, unknown>,
    );
    expect(list).toMatchObject({listType: 'bullet', type: 'list'});
    expect('tag' in list).toBe(false);
    // the legacy form still writes it, as it always has
    const legacy = editor.read(
      () =>
        (
          $exportJSON(undefined, {compact: false})
            .root as unknown as SerializedElementNode
        ).children[0] as unknown as Record<string, unknown>,
    );
    expect(legacy).toMatchObject({tag: 'ul'});
  });

  test('compaction still applies to what overrides produce', () => {
    using editor = buildEditor({
      compact: true,
      overrides: [
        jsonOverride([$isTextNode], {
          $exportJSON: (node, $next) => ({...$next(), text: 'x'}),
        }),
      ],
    });
    const root = exportRoot(editor);
    expect(childrenOf(root.children[0])).toEqual([
      {text: 'x', type: 'text'},
      // the bold sibling keeps the one property that differs from its default
      {format: 1, text: 'x', type: 'text'},
    ]);
  });
});
