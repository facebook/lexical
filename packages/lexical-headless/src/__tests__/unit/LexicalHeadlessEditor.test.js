/**
 * @jest-environment node
 */

// Jest environment should be at the very top of the file. Overridding environment for this test
// to ensure that headless editor works within node environment
// https://jestjs.io/docs/configuration#testenvironment-string

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
  COMMAND_PRIORITY_NORMAL,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  ParagraphNode,
} from 'lexical';

import {createHeadlessEditor} from '../../';

describe('LexicalHeadlessEditor', () => {
  let editor;

  async function update(callback) {
    return new Promise((resolve) => {
      editor.update(callback, {onUpdate: resolve});
    });
  }

  function assertEditorState(editorState, nodes) {
    const nodesFromState = Array.from(editorState._nodeMap).map(
      (pair) => pair[1],
    );
    expect(nodesFromState).toEqual(
      nodes.map((node) => expect.objectContaining(node)),
    );
  }

  beforeEach(() => {
    editor = createHeadlessEditor();
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
        '{"_nodeMap":[["root",{"__children":["1"],"__dir":null,"__format":0,"__indent":0,"__key":"root","__parent":null,"__type":"root"}],["1",{"__type":"paragraph","__parent":"root","__key":"1","__children":["2","3"],"__format":0,"__indent":0,"__dir":null}],["2",{"__type":"text","__parent":"1","__key":"2","__text":"Hello","__format":1,"__style":"","__mode":0,"__detail":0}],["3",{"__type":"text","__parent":"1","__key":"3","__text":"world","__format":0,"__style":"","__mode":0,"__detail":0}]],"_selection":null}',
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
});
