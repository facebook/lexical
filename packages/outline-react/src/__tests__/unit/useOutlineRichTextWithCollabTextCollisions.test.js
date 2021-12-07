/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createTestConnection, waitForReact} from './utils';
import {$getRoot, $createTextNode, $getSelection} from 'outline';
import {$createParagraphNode} from 'outline/ParagraphNode';

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
  let expectedText = '<div contenteditable="true" data-outline-editor="true">';

  for (let i = 0; i < count; ++i) {
    const text = `Hello world ${i + 1}.`;
    expectedText += '<p dir="ltr"><span data-outline-text="true">';
    expectedText += text;
    expectedText += '</span></p>';
  }

  expectedText += '</div>';
  expect(expectedText).toEqual(client.getHTML());
}

function testClientsForEquality(clients: Array<Client>) {
  for (let i = 1; i < clients.length; ++i) {
    expect(clients[0].getHTML()).toEqual(clients[i].getHTML());
    expect(clients[0].getDocJSON()).toEqual(clients[i].getDocJSON());
  }
}

describe('useOutlineRichTextWithCollabLists', () => {
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
        createSampleParagraphsWithClient(clients[0], clientCount);
      });
    });

    verifySampleParagraphsWithClient(clients[0], clientCount);

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
});
