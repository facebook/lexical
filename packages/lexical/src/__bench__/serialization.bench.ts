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
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  ParagraphNode,
  TextNode,
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

/**
 * The same document, plus every node in it, and the editor to read them under.
 * Exporting a node needs an active editor state, so the benchmarks below read
 * inside `editor.read` — a fixed cost both sides pay.
 */
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

// The headroom a build step would buy. `generated*Export` below is what a
// generator emits for these two classes: an object literal, with every decision
// the schema makes — which accessor to read, which properties the compact form
// drops, how a value is normalized — resolved when the code is written rather
// than walked per node. No loop, no closure, and no reference to the schema at
// runtime. Measured against the schema-driven walk it replaces, so a codegen
// change has a number to move.
//
// Note this runs with __DEV__ true, so the walk also pays the per-node
// own-field validation that a production build compiles out.
const TEXT_MODES = ['normal', 'token', 'segmented'] as const;

// What a generator would emit for TextNode: an object literal, every decision
// the schema makes resolved at build time, no schema reference at runtime.
function generatedTextExport(this: TextNode) {
  return {
    detail: this.__detail,
    format: this.__format,
    mode: TEXT_MODES[this.__mode],
    style: this.__style,
    text: this.__text,
    type: 'text',
    version: 1,
  };
}

function generatedParagraphExport(this: ParagraphNode) {
  const json: {[k: string]: unknown} = {
    children: [],
    direction: this.__dir,
    format: this.getFormatType(),
    indent: this.__indent,
    type: 'paragraph',
    version: 1,
  };
  // ElementNode persists these only when the element has no TextNode child to
  // carry them, so the generated code inlines that condition too.
  const textFormat = this.__textFormat;
  const textStyle = this.__textStyle;
  if (textFormat !== 0 || textStyle !== '') {
    let child = this.getFirstChild();
    let hasText = false;
    while (child !== null) {
      if (child.getType() === 'text') {
        hasText = true;
        break;
      }
      child = child.getNextSibling();
    }
    if (!hasText) {
      json.textFormat = textFormat;
      json.textStyle = textStyle;
    }
  }
  return json;
}

describe('per-node exportJSON', () => {
  let nodes: LexicalNode[] = [];

  bench(
    'schema-driven walk',
    () => {
      benchEditor.read(() => {
        for (let i = 0; i < nodes.length; i++) {
          _benchSink = nodes[i].exportJSON();
        }
      });
    },
    {setup: () => (nodes = buildNodes())},
  );

  bench(
    'generated object literal',
    () => {
      benchEditor.read(() => {
        for (let i = 0; i < nodes.length; i++) {
          _benchSink = nodes[i].exportJSON();
        }
      });
    },
    {
      setup: () => {
        nodes = buildNodes();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (TextNode.prototype as any).exportJSON = generatedTextExport;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ParagraphNode.prototype as any).exportJSON = generatedParagraphExport;
      },
    },
  );
});
