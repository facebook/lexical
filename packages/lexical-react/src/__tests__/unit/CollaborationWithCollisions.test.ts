/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isTextNode,
  $setSelection,
  GridSelection,
  LexicalNode,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {
  connectClients,
  createAndStartClients,
  createTestConnection,
  disconnectClients,
  stopClients,
  testClientsForEquality,
  waitForReact,
} from './utils';

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
  anchorOffset: number;
  anchorPath: Array<number>;
  focusOffset: number;
  focusPath: Array<number>;
}): GridSelection | NodeSelection | RangeSelection => {
  const selection = $createRangeSelection();
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
  anchorOffset: number;
  anchorPath: Array<number>;
  focusOffset: number;
  focusPath: Array<number>;
  text: string | null | undefined;
}) => {
  const selection = $createSelectionByPath({
    anchorOffset,
    anchorPath,
    focusOffset,
    focusPath,
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
    clients: Array<() => void>;
    expectedHTML: string | null | undefined;
    init: () => void;
    name: string;
  }> = [
    {
      clients: [
        () => {
          // First client deletes text from first and second paragraphs
          $replaceTextByPath({
            anchorOffset: 5,
            anchorPath: [0, 0],
            focusOffset: 6,
            focusPath: [1, 0],
            text: '',
          });
        },
        () => {
          // Second client deletes first paragraph
          $getRoot().getFirstChild().remove();
        },
      ],
      expectedHTML: null,
      init: () => {
        $insertParagraph('Hello world 1');
        $insertParagraph('Hello world 2');
        $insertParagraph('Hello world 3');
      },
      name: 'Remove text at within the first of multiple paragraphs colliding with removing first paragraph',
    },
    {
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
      expectedHTML: null,
      init: () => {
        $insertParagraph('Hello world 1');
        $insertParagraph('Hello world 2');
        $insertParagraph('Hello world 3');
      },
      name: 'Remove first two paragraphs colliding with removing first paragraph',
    },
    {
      clients: [
        () => {
          $replaceTextByPath({
            anchorOffset: 0,
            anchorPath: [0, 0],
            focusOffset: 7,
            focusPath: [1, 0],
            text: 'Hello client 1',
          });
        },
        () => {
          $replaceTextByPath({
            anchorOffset: 5,
            anchorPath: [1, 0],
            focusOffset: 5,
            focusPath: [2, 0],
            text: 'Hello client 2',
          });
        },
      ],
      expectedHTML: null,
      init: () => {
        $insertParagraph('Hello world 1');
        $insertParagraph('Hello world 2');
        $insertParagraph('Hello world 3');
      },
      name: 'Editing first and second paragraphs colliding with editing second and third paragraphs (with overlapping edit)',
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
