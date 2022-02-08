/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  createTestConnection,
  waitForReact,
  createAndStartClients,
  testClientsForEquality,
  connectClients,
  disconnectClients,
  stopClients,
} from './utils';
import {
  $getRoot,
  $createTextNode,
  $setSelection,
  $createSelection,
  $isTextNode,
  Selection,
  LexicalNode,
  $createParagraphNode,
} from 'lexical';

const $insertParagraph = (...children: Array<string | LexicalNode>) => {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  const nodes = children.map((child) => {
    return typeof child === 'string' ? $createTextNode(child) : child;
  });
  paragraph.append(...nodes);
  root.append(paragraph);
};

const $createSelectionByPath = ({
  anchorPath,
  anchorOffset,
  focusPath,
  focusOffset,
}: {
  anchorPath: Array<number>,
  anchorOffset: number,
  focusPath: Array<number>,
  focusOffset: number,
}): Selection => {
  const selection = $createSelection();
  const root = $getRoot();
  const anchorNode = anchorPath.reduce(
    (node, index) => node.getChildAtIndex(index),
    root,
  );
  const focusNode = focusPath.reduce(
    (node, index) => node.getChildAtIndex(index),
    root,
  );
  selection.anchor.set(
    anchorNode.getKey(),
    anchorOffset,
    $isTextNode(anchorNode) ? 'text' : 'element',
  );
  selection.focus.set(
    focusNode.getKey(),
    focusOffset,
    $isTextNode(focusNode) ? 'text' : 'element',
  );
  $setSelection(selection);
  return selection;
};

const $replaceTextByPath = ({
  anchorPath,
  anchorOffset,
  focusPath,
  focusOffset,
  text = '',
}: {
  anchorPath: Array<number>,
  anchorOffset: number,
  focusPath: Array<number>,
  focusOffset: number,
  text: ?string,
}) => {
  const selection = $createSelectionByPath({
    anchorPath,
    anchorOffset,
    focusPath,
    focusOffset,
  });
  selection.insertText(text);
};

describe('CollaborationWithCollisions', () => {
  let container = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  const SIMPLE_TEXT_COLLISION_TESTS: Array<{
    name: String,
    init: () => void,
    clients: Array<() => void>,
    expectedHTML: ?String,
  }> = [
    {
      name: 'Remove text at within the first of multiple paragraphs colliding with removing first paragraph',
      init: () => {
        $insertParagraph('Hello world 1');
        $insertParagraph('Hello world 2');
        $insertParagraph('Hello world 3');
      },
      clients: [
        () => {
          // First client deletes text from first and second paragraphs
          $replaceTextByPath({
            anchorPath: [0, 0],
            anchorOffset: 5,
            focusPath: [1, 0],
            focusOffset: 6,
          });
        },
        () => {
          // Second client deletes first paragraph
          $getRoot().getFirstChild().remove();
        },
      ],
    },
    {
      name: 'Remove first two paragraphs colliding with removing first paragraph',
      init: () => {
        $insertParagraph('Hello world 1');
        $insertParagraph('Hello world 2');
        $insertParagraph('Hello world 3');
      },
      clients: [
        () => {
          // First client deletes first two paragraphs
          const paragraphs = $getRoot().getChildren();
          paragraphs[0].remove();
          paragraphs[1].remove();
        },
        () => {
          // Second client deletes first paragraph
          $getRoot().getFirstChild().remove();
        },
      ],
    },
    {
      name: 'Editing first and second paragraphs colliding with editing second and third paragraphs (with overlapping edit)',
      init: () => {
        $insertParagraph('Hello world 1');
        $insertParagraph('Hello world 2');
        $insertParagraph('Hello world 3');
      },
      clients: [
        () => {
          $replaceTextByPath({
            anchorPath: [0, 0],
            anchorOffset: 0,
            focusPath: [1, 0],
            focusOffset: 7,
            text: 'Hello client 1',
          });
        },
        () => {
          $replaceTextByPath({
            anchorPath: [1, 0],
            anchorOffset: 5,
            focusPath: [2, 0],
            focusOffset: 5,
            text: 'Hello client 2',
          });
        },
      ],
    },
  ];

  SIMPLE_TEXT_COLLISION_TESTS.forEach((testCase) => {
    it(testCase.name, async () => {
      const connection = createTestConnection();
      const clients = createAndStartClients(
        connection,
        container,
        testCase.clients.length,
      );

      // Set initial content (into first editor only, the rest will be sync'd)
      const clientA = clients[0];

      await waitForReact(() => {
        clientA.update(() => {
          $getRoot().clear();
          testCase.init();
        });
      });

      testClientsForEquality(clients);

      // Disconnect clients and apply client-specific actions, reconnect them back and
      // verify that they're sync'd and have the same content
      disconnectClients(clients);

      for (let i = 0; i < clients.length; i++) {
        await waitForReact(() => {
          clients[i].update(testCase.clients[i]);
        });
      }

      await waitForReact(() => {
        connectClients(clients);
      });

      if (testCase.expectedHTML) {
        expect(clientA.getHTML()).toEqual(testCase.expectedHTML);
      }

      testClientsForEquality(clients);
      stopClients(clients);
    });
  });
});
