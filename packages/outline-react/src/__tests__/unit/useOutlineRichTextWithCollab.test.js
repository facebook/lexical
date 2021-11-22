/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createTestConnection} from './utils';
import {getRoot, createTextNode} from 'outline';

describe('useOutlineRichTextWithCollab', () => {
  let container = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;

    jest.restoreAllMocks();
  });

  it('Should collaborate basic text insertion between two clients', async () => {
    const connector = createTestConnection();
    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');

    client1.start(container);
    client2.start(container);

    // Should be empty, as client has not yet updated
    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-outline-editor="true"></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());

    // Wait for clients to render the initial content
    await Promise.resolve().then();

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-outline-editor="true"><p><br></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    // Insert some text on client 1
    await client1.update(() => {
      const root = getRoot();
      const paragraph = root.getFirstChild();
      const text = createTextNode('Hello world');
      paragraph.append(text);
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-outline-editor="true"><p><span data-outline-text="true">Hello world</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    // Insert some text on client 2
    await client2.update(() => {
      const root = getRoot();
      const paragraph = root.getFirstChild();
      const text = paragraph.getFirstChild();
      text.spliceText(6, 5, 'metaverse');
    });

    expect(client2.getHTML()).toEqual(
      '<div contenteditable="true" data-outline-editor="true"><p dir="ltr"><span data-outline-text="true">Hello metaverse</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());
  });
});
