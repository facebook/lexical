/**
 * @jest-environment node
 */

// Jest environment should be at the very top of the file. overriding environment for this test
// to ensure that headless editor works within node environment
// https://jestjs.io/docs/configuration#testenvironment-string

/* eslint-disable header/header */

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor, RangeSelection} from 'lexical';

import {$generateHtmlFromNodes} from '@lexical/html';
import {JSDOM} from 'jsdom';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  COMMAND_PRIORITY_NORMAL,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  ParagraphNode,
} from 'lexical';

import {createHeadlessEditor} from '../..';

describe('LexicalHeadlessEditor', () => {
  let editor: LexicalEditor;

  async function update(updateFn: () => void) {
    editor.update(updateFn);
    await Promise.resolve();
  }

  function assertEditorState(
    editorState: EditorState,
    nodes: Record<string, unknown>[],
  ) {
    const nodesFromState = Array.from(editorState._nodeMap.values());
    expect(nodesFromState).toEqual(
      nodes.map((node) => expect.objectContaining(node)),
    );
  }

  beforeEach(() => {
    editor = createHeadlessEditor({
      namespace: '',
      onError: (error) => {
        throw error;
      },
    });
  });

  it('should be headless environment', async () => {
    expect(typeof window === 'undefined').toBe(true);
    expect(typeof document === 'undefined').toBe(true);
    expect(typeof navigator === 'undefined').toBe(true);
  });

  it('can update editor', async () => {
    await update(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('Hello').toggleFormat('bold'),
          $createTextNode('world'),
        ),
      );
    });

    assertEditorState(editor.getEditorState(), [
      {
        __key: 'root',
      },
      {
        __type: 'paragraph',
      },
      {
        __format: 1,
        __text: 'Hello',
        __type: 'text',
      },
      {
        __format: 0,
        __text: 'world',
        __type: 'text',
      },
    ]);
  });

  it('can set editor state from json', async () => {
    editor.setEditorState(
      editor.parseEditorState(
        '{"root":{"children":[{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Hello","type":"text","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"world","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
      ),
    );

    assertEditorState(editor.getEditorState(), [
      {
        __key: 'root',
      },
      {
        __type: 'paragraph',
      },
      {
        __format: 1,
        __text: 'Hello',
        __type: 'text',
      },
      {
        __format: 0,
        __text: 'world',
        __type: 'text',
      },
    ]);
  });

  it('can register listeners', async () => {
    const onUpdate = jest.fn();
    const onCommand = jest.fn();
    const onTransform = jest.fn();
    const onTextContent = jest.fn();

    editor.registerUpdateListener(onUpdate);
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      onCommand,
      COMMAND_PRIORITY_NORMAL,
    );
    editor.registerNodeTransform(ParagraphNode, onTransform);
    editor.registerTextContentListener(onTextContent);

    await update(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('Hello').toggleFormat('bold'),
          $createTextNode('world'),
        ),
      );
      editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, 'foo');
    });

    expect(onUpdate).toBeCalled();
    expect(onCommand).toBeCalledWith('foo', expect.anything());
    expect(onTransform).toBeCalledWith(
      expect.objectContaining({__type: 'paragraph'}),
    );
    expect(onTextContent).toBeCalledWith('Helloworld');
  });

  it('can preserve selection for pending editor state (within update loop)', async () => {
    await update(() => {
      const textNode = $createTextNode('Hello world');
      $getRoot().append($createParagraphNode().append(textNode));
      textNode.select(1, 2);
    });

    await update(() => {
      const selection = $getSelection() as RangeSelection;
      expect(selection.anchor).toEqual(
        expect.objectContaining({offset: 1, type: 'text'}),
      );
      expect(selection.focus).toEqual(
        expect.objectContaining({offset: 2, type: 'text'}),
      );
    });
  });

  function setupDom() {
    const jsdom = new JSDOM();

    const _window = global.window;
    const _document = global.document;

    // @ts-expect-error
    global.window = jsdom.window;
    global.document = jsdom.window.document;

    return () => {
      global.window = _window;
      global.document = _document;
    };
  }

  it('can generate html from the nodes when dom is set', async () => {
    editor.setEditorState(
      // "hello world"
      editor.parseEditorState(
        `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"hello world","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
      ),
    );

    const cleanup = setupDom();

    const html = editor
      .getEditorState()
      .read(() => $generateHtmlFromNodes(editor, null));

    cleanup();

    expect(html).toBe(
      '<p dir="ltr"><span style="white-space: pre-wrap;">hello world</span></p>',
    );
  });
});
