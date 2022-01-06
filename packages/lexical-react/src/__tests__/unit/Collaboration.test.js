/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createTestConnection, waitForReact} from './utils';
import {$getRoot, $createTextNode} from 'lexical';

describe('Collaboration', () => {
  let container = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  async function exepctCorrectInitialContent(client1, client2) {
    // Should be empty, as client has not yet updated
    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());

    // Wait for clients to render the initial content
    await Promise.resolve().then();

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());
  }

  it('Should collaborate basic text insertion between two clients', async () => {
    const connector = createTestConnection();
    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');

    client1.start(container);
    client2.start(container);

    await exepctCorrectInitialContent(client1, client2);

    // Insert a text node on client 1
    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const text = $createTextNode('Hello world');
        paragraph.append(text);
      });
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello world</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    // Insert some text on client 2
    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const text = paragraph.getFirstChild();
        text.spliceText(6, 5, 'metaverse');
      });
    });

    expect(client2.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello metaverse</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '[object Object]Hello metaverse',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    client1.stop();
    client2.stop();
  });

  it('Should collaborate basic text insertion conflicts between two clients', async () => {
    const connector = createTestConnection();
    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');

    client1.start(container);
    client2.start(container);

    await exepctCorrectInitialContent(client1, client2);

    client1.disconnect();

    // Insert some a text node on client 1
    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const text = $createTextNode('Hello world');
        paragraph.append(text);
      });
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello world</span></p></div>',
    );
    expect(client2.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
    );

    // Insert some a text node on client 1
    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const text = $createTextNode('Hello world');
        paragraph.append(text);
      });
    });

    expect(client2.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello world</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());

    await waitForReact(() => {
      client1.connect();
    });

    // Text content should be repeated, but there should only be a single node
    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello worldHello world</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '[object Object]Hello worldHello world',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    client2.disconnect();

    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const text = paragraph.getFirstChild();
        text.spliceText(11, 11, '');
      });
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello world</span></p></div>',
    );
    expect(client2.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello worldHello world</span></p></div>',
    );

    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const text = paragraph.getFirstChild();
        text.spliceText(11, 11, '!');
      });
    });

    await waitForReact(() => {
      client2.connect();
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello world!</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '[object Object]Hello world!',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    client1.stop();
    client2.stop();
  });

  it('Should collaborate basic text deletion conflicts between two clients', async () => {
    const connector = createTestConnection();
    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');

    client1.start(container);
    client2.start(container);

    await exepctCorrectInitialContent(client1, client2);

    // Insert some a text node on client 1
    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        const text = $createTextNode('Hello world');
        paragraph.append(text);
      });
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello world</span></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '[object Object]Hello world',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    client1.disconnect();

    // Delete the text on client 1
    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        paragraph.getFirstChild().remove();
      });
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
    );
    expect(client2.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello world</span></p></div>',
    );

    // Insert some text on client 2
    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        paragraph.getFirstChild().spliceText(11, 0, 'Hello world');
      });
    });

    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
    );
    expect(client2.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">Hello worldHello world</span></p></div>',
    );

    await waitForReact(() => {
      client1.connect();
    });

    // TODO we can probably handle these conflicts better. We could keep around
    // a "fallback" {Map} when we remove text without any adjacent text nodes. This
    // would require big changes in `CollabElementNode.splice` and also need adjustments
    // in `CollabElementNode.applyChildrenYjsDelta` to handle the existance of these
    // fallback maps. For now though, if a user clears all text nodes from an element
    // and another user inserts some text into the same element at the same time, the
    // deletion will take precedence on conflicts.
    expect(client1.getHTML()).toEqual(
      '<div contenteditable="true" data-lexical-editor="true"><p><br></p></div>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    client1.stop();
    client2.stop();
  });
});
