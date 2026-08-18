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
  getExtensionDependencyFromEditor,
  jsonOverride,
  type SerializationConfig,
  SerializationExtension,
} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTextNode,
  type SerializedLexicalNode,
  type SerializedTextNode,
  TextNode,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

type SerializedJSON = Record<string, unknown> & {children?: SerializedJSON[]};

function buildEditor(config: Partial<SerializationConfig> = {}) {
  const editor = buildEditorFromExtensions({
    dependencies: [configExtension(SerializationExtension, config)],
    name: '[root]',
    namespace: '',
    onError: err => {
      throw err;
    },
  });
  onTestFinished(() => editor.dispose());
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
  editor: ReturnType<typeof buildEditor>,
  options?: {compact?: boolean},
): SerializedJSON {
  const {exportJSON} = getExtensionDependencyFromEditor(
    editor,
    SerializationExtension,
  ).output;
  return editor.read(
    () => exportJSON(undefined, options).root as unknown as SerializedJSON,
  );
}

function texts(root: SerializedJSON): unknown[] {
  return root.children![0].children!.map(child => child.text);
}

describe('SerializationExtension', () => {
  test('defaults to the legacy form', () => {
    const root = exportRoot(buildEditor());
    expect(root.version).toBe(1);
    expect(root.children![0]).toMatchObject({indent: 0, type: 'paragraph'});
  });

  test('config `compact` drops version and default-valued properties', () => {
    const root = exportRoot(buildEditor({compact: true}));
    expect(root).not.toHaveProperty('version');
    expect(Object.keys(root.children![0]).sort()).toEqual(['children', 'type']);
  });

  test('the per-call option wins over the configured default', () => {
    const compactEditor = buildEditor({compact: true});
    expect(exportRoot(compactEditor, {compact: false}).version).toBe(1);
    const legacyEditor = buildEditor();
    expect(exportRoot(legacyEditor, {compact: true})).not.toHaveProperty(
      'version',
    );
  });

  test('an override matched by node class omits matching nodes', () => {
    const root = exportRoot(
      buildEditor({
        overrides: [jsonOverride([TextNode], {$exportJSON: () => null})],
      }),
    );
    expect(texts(root)).toEqual([]);
  });

  test('an override matched by type guard can replace a node', () => {
    const root = exportRoot(
      buildEditor({
        overrides: [
          jsonOverride([$isTextNode], {
            $exportJSON: (node, $next) =>
              node.getTextContent() === 'secret'
                ? {...$next(), text: 'REDACTED'}
                : $next(),
          }),
        ],
      }),
    );
    expect(texts(root)).toEqual(['plain', 'REDACTED']);
  });

  test("'*' matches every node", () => {
    const seen: string[] = [];
    exportRoot(
      buildEditor({
        overrides: [
          jsonOverride('*', {
            $exportJSON: (node, $next) => {
              seen.push(node.getType());
              return $next();
            },
          }),
        ],
      }),
    );
    expect(seen.sort()).toEqual(['paragraph', 'root', 'text', 'text']);
  });

  test('overrides chain through $next, first listed outermost', () => {
    const order: string[] = [];
    const root = exportRoot(
      buildEditor({
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
      }),
    );
    // the second override runs first (it is nearer the default), and the first
    // one wraps whatever it returned
    expect(order.slice(0, 2)).toEqual(['inner', 'outer']);
    expect(texts(root)).toEqual(['outer(inner)', 'outer(inner)']);
  });

  test('a lower-priority omission wins over a higher-priority enhancement', () => {
    const root = exportRoot(
      buildEditor({
        overrides: [
          jsonOverride('*', {
            $exportJSON: (node, $next) => $next(),
          }),
          jsonOverride([$isTextNode], {
            $exportJSON: () => null,
          }),
        ],
      }),
    );
    expect(texts(root)).toEqual([]);
  });

  test('compaction still applies to what overrides produce', () => {
    const root = exportRoot(
      buildEditor({
        compact: true,
        overrides: [
          jsonOverride([$isTextNode], {
            $exportJSON: (node, $next) =>
              ({...$next(), text: 'x'}) as SerializedLexicalNode,
          }),
        ],
      }),
    );
    expect(root.children![0].children).toEqual([
      {text: 'x', type: 'text'},
      // the bold sibling keeps the one property that differs from its default
      {format: 1, text: 'x', type: 'text'},
    ]);
  });
});
