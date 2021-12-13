/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createTestConnection, waitForReact} from './utils';
import {$getRoot, $createTextNode, $getSelection} from 'lexical';
import {$createParagraphNode} from 'lexical/ParagraphNode';

function createAndStartClients(
  connector: TestConnection,
  aContainer: any,
  count: number,
): Array<Client> {
  const result = [];
  for (let i = 0; i < count; ++i) {
    const id = `${i}`;
    const client = connector.createClient(id);
    client.start(aContainer);
    result.push(client);
  }
  return result;
}

function disconnectClients(clients: Array<Client>) {
  for (let i = 0; i < clients.length; ++i) {
    clients[i].disconnect();
  }
}

function connectClients(clients: Array<Client>) {
  for (let i = 0; i < clients.length; ++i) {
    clients[i].connect();
  }
}

function stopClients(clients: Array<Client>) {
  for (let i = 0; i < clients.length; ++i) {
    clients[i].stop();
  }
}

function removeInitialParagraph() {
  const root = $getRoot();
  const paragraph = root.getFirstChild();
  paragraph.remove();
}

function createSampleParagraphsWithClient(client: Client, count: number) {
  const root = $getRoot();
  for (let i = 0; i < count; ++i) {
    const paragraph = $createParagraphNode();
    const text = `Hello world ${i + 1}.`;

    paragraph.append($createTextNode(text));
    root.append(paragraph);
  }
}

function verifySampleParagraphsWithClient(client: Client, count: number) {
  let expectedText = '';

  for (let i = 0; i < count; ++i) {
    const text = `Hello world ${i + 1}.`;
    expectedText += '<p dir="ltr"><span data-lexical-text="true">';
    expectedText += text;
    expectedText += '</span></p>';
  }

  expect(expectedText).toEqual(client.getHTML());
}

function testClientsForEquality(clients: Array<Client>) {
  for (let i = 1; i < clients.length; ++i) {
    expect(clients[0].getHTML()).toEqual(clients[i].getHTML());
    expect(clients[0].getDocJSON()).toEqual(clients[i].getDocJSON());
  }
}

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

  it('Remove text at within the first of multiple paragraphs colliding with removing first paragraph.', async () => {
    const clientCount = 2;
    const connector = createTestConnection();
    const sampleParagraphCount = 2;
    const clients: Array<Client> = createAndStartClients(
      connector,
      container,
      clientCount,
    );

    const client = clients[0];
    expect(client != null).toBe(true);

    // Setup document for collision tests.
    await waitForReact(() => {
      clients[0].update(() => {
        removeInitialParagraph();
        createSampleParagraphsWithClient(clients[0], sampleParagraphCount);
      });
    });

    verifySampleParagraphsWithClient(clients[0], sampleParagraphCount);

    disconnectClients(clients);

    // Client 1:remove text within paragraph 1 and 2.
    let clientIndex = 0;
    await waitForReact(() => {
      clients[clientIndex].update(() => {
        const root = $getRoot();
        const paragraph1 = root.getFirstChild();
        const paragraph2 = paragraph1.getNextSibling();
        const textNode = paragraph1.getFirstChild();
        textNode.select(0, 0);
        const selection = $getSelection();
        selection.anchor.set(paragraph1.getFirstChild().getKey(), 5, 'text');
        selection.focus.set(paragraph2.getFirstChild().getKey(), 6, 'text');
        selection.removeText();
      });
    });

    // Remove paragraph 2.
    clientIndex = 1;
    await waitForReact(() => {
      clients[clientIndex].update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        paragraph.remove();
      });
    });

    await waitForReact(() => {
      connectClients(clients);
    });

    testClientsForEquality(clients);
    stopClients(clients);
  });

  it('General text deletion collision testing.', async () => {
    type ClientTest = {
      anchorIndex: number,
      anchorOffset: number,
      focusIndex: number,
      focusOffset: number,
      removeText: boolean,
    };

    type TestCriteriaForTextCollabCollisions = {
      clientCount: number,
      clientTestCriteria: Array<ClientTest>,
      sampleParagraphCount: number,
      testCount: number,
    };

    const testCriteria: TestCriteriaForTextCollabCollisions = {
      clientCount: 2,
      clientTestCriteria: [
        {
          anchorIndex: 0,
          anchorOffset: 5,
          focusIndex: 1,
          focusOffset: 6,
          removeText: true,
        },
        {
          anchorIndex: 0,
          anchorOffset: 5,
          focusIndex: 1,
          focusOffset: 6,
          removeText: true,
        },
      ],
      sampleParagraphCount: 2,
      testCount: 2,
    };

    for (let testIndex = 0; testIndex < testCriteria.testCount; ++testIndex) {
      const connector = createTestConnection();
      const clients: Array<Client> = createAndStartClients(
        connector,
        container,
        testCriteria.clientCount,
      );
      const testCriterion = testCriteria.clientTestCriteria[testIndex];

      const client = clients[0];
      expect(client != null).toBe(true);

      // Setup document for collision tests.
      await waitForReact(() => {
        clients[0].update(() => {
          removeInitialParagraph();
          createSampleParagraphsWithClient(
            clients[0],
            testCriteria.sampleParagraphCount,
          );
        });
      });

      verifySampleParagraphsWithClient(
        clients[0],
        testCriteria.sampleParagraphCount,
      );

      disconnectClients(clients);

      // Perform edits on the clients
      let clientIndex = 0;
      await waitForReact(() => {
        clients[clientIndex].update(() => {
          const root = $getRoot();
          const paragraph1 = root.getFirstChild();
          // const paragraph2 = paragraph1.getNextSibling();
          const textNode = paragraph1.getFirstChild();
          textNode.select(0, 0);
          const selection = $getSelection();

          selection.anchor.set(
            root.getChildrenKeys()[testCriterion[clientIndex].anchorIndex],
            testCriterion[clientIndex].anchorOffset,
            'text',
          );

          selection.focus.set(
            root.getChildrenKeys()[testCriterion[clientIndex].focusIndex],
            testCriterion[clientIndex].focusOffset,
            'text',
          );

          if (testCriterion[clientIndex].removeText === true) {
            selection.removeText();
          }
        });
      });

      // Remove paragraph 2.
      clientIndex = 1;
      await waitForReact(() => {
        clients[clientIndex].update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          paragraph.remove();
        });
      });

      await waitForReact(() => {
        connectClients(clients);
      });

      testClientsForEquality(clients);
      stopClients(clients);
    }
  });
});
