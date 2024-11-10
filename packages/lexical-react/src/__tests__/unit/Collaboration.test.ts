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
  ParagraphNode,
  TextNode,
  UNDO_COMMAND,
} from 'lexical';

import {Client, createTestConnection, waitForReact} from './utils';

describe('Collaboration', () => {
  let container: null | HTMLDivElement = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
  });

  async function expectCorrectInitialContent(client1: Client, client2: Client) {
    // Should be empty, as client has not yet updated
    expect(client1.getHTML()).toEqual('');
    expect(client1.getHTML()).toEqual(client2.getHTML());

    // Wait for clients to render the initial content
    await Promise.resolve().then();

    expect(client1.getHTML()).toEqual('<p><br></p>');
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());
  }

  it('Should collaborate basic text insertion between two clients', async () => {
    const connector = createTestConnection();

    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');

    client1.start(container!);
    client2.start(container!);

    await expectCorrectInitialContent(client1, client2);

    // Insert a text node on client 1
    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>();

        const text = $createTextNode('Hello world');

        paragraph!.append(text);
      });
    });

    expect(client1.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello world</span></p>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    // Insert some text on client 2
    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        const text = paragraph.getFirstChild<TextNode>()!;

        text.spliceText(6, 5, 'metaverse');
      });
    });

    expect(client2.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello metaverse</span></p>',
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

    client1.start(container!);
    client2.start(container!);

    await expectCorrectInitialContent(client1, client2);

    client1.disconnect();

    // Insert some a text node on client 1
    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        const text = $createTextNode('Hello world');

        paragraph.append(text);
      });
    });
    expect(client1.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello world</span></p>',
    );
    expect(client2.getHTML()).toEqual('<p><br></p>');

    // Insert some a text node on client 1
    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        const text = $createTextNode('Hello world');

        paragraph.append(text);
      });
    });

    expect(client2.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello world</span></p>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());

    await waitForReact(() => {
      client1.connect();
    });

    // Text content should be repeated, but there should only be a single node
    expect(client1.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello worldHello world</span></p>',
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

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        const text = paragraph.getFirstChild<TextNode>()!;

        text.spliceText(11, 11, '');
      });
    });

    expect(client1.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello world</span></p>',
    );
    expect(client2.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello worldHello world</span></p>',
    );

    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        const text = paragraph.getFirstChild<TextNode>()!;

        text.spliceText(11, 11, '!');
      });
    });

    await waitForReact(() => {
      client2.connect();
    });

    expect(client1.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello world!</span></p>',
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
    client1.start(container!);
    client2.start(container!);

    await expectCorrectInitialContent(client1, client2);

    // Insert some a text node on client 1
    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        const text = $createTextNode('Hello world');
        paragraph.append(text);
      });
    });

    expect(client1.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello world</span></p>',
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

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        paragraph.getFirstChild()!.remove();
      });
    });

    expect(client1.getHTML()).toEqual('<p><br></p>');
    expect(client2.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello world</span></p>',
    );

    // Insert some text on client 2
    await waitForReact(() => {
      client2.update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>()!;

        paragraph.getFirstChild<TextNode>()!.spliceText(11, 0, 'Hello world');
      });
    });

    expect(client1.getHTML()).toEqual('<p><br></p>');
    expect(client2.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello worldHello world</span></p>',
    );

    await waitForReact(() => {
      client1.connect();
    });

    // TODO we can probably handle these conflicts better. We could keep around
    // a "fallback" {Map} when we remove text without any adjacent text nodes. This
    // would require big changes in `CollabElementNode.splice` and also need adjustments
    // in `CollabElementNode.applyChildrenYjsDelta` to handle the existence of these
    // fallback maps. For now though, if a user clears all text nodes from an element
    // and another user inserts some text into the same element at the same time, the
    // deletion will take precedence on conflicts.
    expect(client1.getHTML()).toEqual('<p><br></p>');
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());
    client1.stop();
    client2.stop();
  });

  it('Should allow the passing of arbitrary awareness data', async () => {
    const connector = createTestConnection();

    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');

    const awarenessData1 = {
      foo: 'foo',
      uuid: Math.floor(Math.random() * 10000),
    };
    const awarenessData2 = {
      bar: 'bar',
      uuid: Math.floor(Math.random() * 10000),
    };

    client1.start(container!, awarenessData1);
    client2.start(container!, awarenessData2);

    await expectCorrectInitialContent(client1, client2);

    expect(client1.awareness.getLocalState()!.awarenessData).toEqual(
      awarenessData1,
    );
    expect(client2.awareness.getLocalState()!.awarenessData).toEqual(
      awarenessData2,
    );

    client1.stop();
    client2.stop();
  });

  /**
   * When a document is not bootstrapped (via `shouldBootstrap`), the document only initializes the initial paragraph
   * node upon the first user interaction. Then, both a new paragraph as well as the user character are inserted as a
   * single Yjs change. However, when the user undos this initial change, the document now has no initial paragraph
   * node. syncYjsChangesToLexical addresses this by doing a check: `$getRoot().getChildrenSize() === 0)` and if true,
   * inserts the paragraph node. However, this insertion was previously being done in an editor.update block that had
   * either the tag 'collaboration' or 'historic'. Then, when `syncLexicalUpdateToYjs` was called, because one of these
   * tags were present, the function would early-return, and this change would not be synced to other clients, causing
   * permanent desync and corruption of the doc for both users. Not only was the change not syncing to other clients,
   * but even the initiating client was not notified via the proper callbacks, and the change would fall through from
   * persistence, causing permanent desync. The fix was to move the insertion of the paragraph node outside of the
   * editor.update block that included the 'collaboration' or 'historic' tag, and instead insert it in a separate
   * editor.update block that did not have these tags.
   */
  it('Should sync to other clients when inserting a new paragraph node when document is emptied via undo', async () => {
    const connector = createTestConnection();

    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');

    client1.start(container!, undefined, {shouldBootstrapEditor: false});
    client2.start(container!, undefined, {shouldBootstrapEditor: false});

    expect(client1.getHTML()).toEqual('');
    expect(client1.getHTML()).toEqual(client2.getHTML());

    // Wait for clients to render the initial content
    await Promise.resolve().then();

    expect(client1.getHTML()).toEqual('');
    expect(client1.getHTML()).toEqual(client2.getHTML());

    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();

        // Since bootstrap is false, we create our own paragraph node
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello');
        paragraph.append(text);

        root.append(paragraph);
      });
    });

    expect(client1.getHTML()).toEqual(
      '<p dir="ltr"><span data-lexical-text="true">Hello</span></p>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '[object Object]Hello',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    await waitForReact(() => {
      // Undo the insertion of the initial paragraph and text node
      client1.getEditor().dispatchCommand(UNDO_COMMAND, undefined);
    });

    // We expect the safety check in syncYjsChangesToLexical to
    // insert a new paragraph node and prevent the document from being empty
    expect(client1.getHTML()).toEqual('<p><br></p>');
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    await waitForReact(() => {
      client1.update(() => {
        const root = $getRoot();

        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello world');
        paragraph.append(text);

        root.append(paragraph);
      });
    });

    expect(client1.getHTML()).toEqual(
      '<p><br></p><p dir="ltr"><span data-lexical-text="true">Hello world</span></p>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual({
      root: '[object Object]Hello world',
    });
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    client1.stop();
    client2.stop();
  });
});
