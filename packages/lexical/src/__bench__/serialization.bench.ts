/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {bench, describe} from 'vitest';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $withCompactExport,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
} from '../index';
import {$writeJSONGetters} from '../LexicalUtils';

// Module-level sink so V8 cannot elide the work being measured.
let _benchSink: unknown;

const PARAGRAPHS = 2000;
const TEXTS_PER_PARAGRAPH = 5;

let benchEditor: LexicalEditor;

function buildEditor(): LexicalEditor {
  const editor = buildEditorFromExtensions(
    defineExtension({$initialEditorState: null, name: '[bench-serialization]'}),
  );
  editor.update(
    () => {
      const root = $getRoot();
      for (let i = 0; i < PARAGRAPHS; i++) {
        const paragraph = $createParagraphNode();
        for (let j = 0; j < TEXTS_PER_PARAGRAPH; j++) {
          const text = $createTextNode(`p${i} t${j}`);
          text.setFormat(j % 2 === 0 ? 1 : 0);
          paragraph.append(text);
        }
        root.append(paragraph);
      }
    },
    {discrete: true},
  );
  return editor;
}

describe('EditorState.toJSON', () => {
  let editorState: EditorState;
  let json: string;

  bench(
    `${PARAGRAPHS * (TEXTS_PER_PARAGRAPH + 1) + 1} nodes`,
    () => {
      _benchSink = editorState.toJSON();
    },
    {
      setup: () => {
        editorState = buildEditor().getEditorState();
      },
    },
  );

  bench(
    `compact, ${PARAGRAPHS * (TEXTS_PER_PARAGRAPH + 1) + 1} nodes`,
    () => {
      _benchSink = $withCompactExport(true, () => editorState.toJSON());
    },
    {
      setup: () => {
        editorState = buildEditor().getEditorState();
      },
    },
  );

  bench(
    `parseEditorState, ${PARAGRAPHS * (TEXTS_PER_PARAGRAPH + 1) + 1} nodes`,
    () => {
      _benchSink = parseTarget.parseEditorState(json);
    },
    {
      setup: () => {
        const editor = buildEditor();
        json = JSON.stringify(editor.getEditorState().toJSON());
        parseTarget = editor;
      },
    },
  );

  let parseTarget: LexicalEditor;
});

// What the generated exporters buy, measured on TextNode only.
//
// The walk arm inlines `LexicalNode.exportJSON` without its generated-exporter
// dispatch, which is the only way to reach the walk for a class that has one.
// TextNode is the fair subject: it has no `exportJSON` override, so the two
// arms differ by exactly the thing being measured — the generated literal
// versus the schema-driven walk — with no post-processing on either side.
function buildTextNodes(): LexicalNode[] {
  const editor = buildEditor();
  const nodes: LexicalNode[] = [];
  editor.read(() => {
    for (const paragraph of $getRoot().getChildren()) {
      for (const child of (paragraph as ParagraphNode).getChildren()) {
        nodes.push(child);
      }
    }
  });
  benchEditor = editor;
  return nodes;
}

describe('per-node exportJSON, TextNode', () => {
  let nodes: LexicalNode[] = [];

  bench(
    'schema-driven walk',
    () => {
      benchEditor.read(() => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const json: {[key: string]: unknown} = {};
          $writeJSONGetters(node, json, false);
          json.type = node.getType();
          json.version = 1;
          _benchSink = json;
        }
      });
    },
    {setup: () => (nodes = buildTextNodes())},
  );

  bench(
    'generated literal',
    () => {
      benchEditor.read(() => {
        for (let i = 0; i < nodes.length; i++) {
          _benchSink = nodes[i].exportJSON();
        }
      });
    },
    {setup: () => (nodes = buildTextNodes())},
  );
});
