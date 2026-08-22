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
  $isElementNode,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
} from '../index';

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

// What the generated exporters buy, measured against the schema-driven walk
// they replace. `exportJSON()` takes the generated literal for a class that has
// one; `exportJSONInto` is the walk, which every other class still uses.
function buildNodes(): LexicalNode[] {
  const editor = buildEditor();
  const nodes: LexicalNode[] = [];
  editor.read(() => {
    for (const paragraph of $getRoot().getChildren()) {
      nodes.push(paragraph);
      for (const child of (paragraph as ParagraphNode).getChildren()) {
        nodes.push(child);
      }
    }
  });
  benchEditor = editor;
  return nodes;
}

describe('per-node exportJSON', () => {
  let nodes: LexicalNode[] = [];

  bench(
    'schema-driven walk',
    () => {
      benchEditor.read(() => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const json: {[key: string]: unknown} = $isElementNode(node)
            ? {children: []}
            : {};
          node.exportJSONInto(json, false);
          _benchSink = json;
        }
      });
    },
    {setup: () => (nodes = buildNodes())},
  );

  bench(
    'generated where available',
    () => {
      benchEditor.read(() => {
        for (let i = 0; i < nodes.length; i++) {
          _benchSink = nodes[i].exportJSON();
        }
      });
    },
    {setup: () => (nodes = buildNodes())},
  );
});
