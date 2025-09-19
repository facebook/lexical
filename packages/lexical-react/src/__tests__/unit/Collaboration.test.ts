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
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import * as Y from 'yjs';

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

    expect(client1.getHTML()).toEqual('<p dir="auto"><br></p>');
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());
  }

  describe.each([[false], [true]])(
    'useCollabV2: %s',
    (useCollabV2: boolean) => {
      it('Should collaborate basic text insertion between two clients', async () => {
        const connector = createTestConnection(useCollabV2);

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
          '<p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
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
          '<p dir="auto"><span data-lexical-text="true">Hello metaverse</span></p>',
        );
        expect(client1.getHTML()).toEqual(client2.getHTML());
        expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

        client1.stop();
        client2.stop();
      });

      it('Should collaborate basic text insertion conflicts between two clients', async () => {
        const connector = createTestConnection(useCollabV2);

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
          '<p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
        );
        expect(client2.getHTML()).toEqual('<p dir="auto"><br></p>');

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
          '<p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
        );
        expect(client1.getHTML()).toEqual(client2.getHTML());

        await waitForReact(() => {
          client1.connect();
        });

        // Text content should be repeated, but there should only be a single node
        expect(client1.getHTML()).toEqual(
          '<p dir="auto"><span data-lexical-text="true">Hello worldHello world</span></p>',
        );
        expect(client1.getHTML()).toEqual(client2.getHTML());
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
          '<p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
        );
        expect(client2.getHTML()).toEqual(
          '<p dir="auto"><span data-lexical-text="true">Hello worldHello world</span></p>',
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
          '<p dir="auto"><span data-lexical-text="true">Hello world!</span></p>',
        );
        expect(client1.getHTML()).toEqual(client2.getHTML());
        expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

        client1.stop();
        client2.stop();
      });

      it('Should collaborate basic text deletion conflicts between two clients', async () => {
        const connector = createTestConnection(useCollabV2);
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
          '<p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
        );
        expect(client1.getHTML()).toEqual(client2.getHTML());
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

        expect(client1.getHTML()).toEqual('<p dir="auto"><br></p>');
        expect(client2.getHTML()).toEqual(
          '<p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
        );

        // Insert some text on client 2
        await waitForReact(() => {
          client2.update(() => {
            const root = $getRoot();

            const paragraph = root.getFirstChild<ParagraphNode>()!;

            paragraph
              .getFirstChild<TextNode>()!
              .spliceText(11, 0, 'Hello world');
          });
        });

        expect(client1.getHTML()).toEqual('<p dir="auto"><br></p>');
        expect(client2.getHTML()).toEqual(
          '<p dir="auto"><span data-lexical-text="true">Hello worldHello world</span></p>',
        );

        await waitForReact(() => {
          client1.connect();
        });

        if (useCollabV2) {
          expect(client1.getHTML()).toEqual(
            '<p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
          );
        } else {
          // TODO we can probably handle these conflicts better. We could keep around
          // a "fallback" {Map} when we remove text without any adjacent text nodes. This
          // would require big changes in `CollabElementNode.splice` and also need adjustments
          // in `CollabElementNode.applyChildrenYjsDelta` to handle the existence of these
          // fallback maps. For now though, if a user clears all text nodes from an element
          // and another user inserts some text into the same element at the same time, the
          // deletion will take precedence on conflicts.
          expect(client1.getHTML()).toEqual('<p dir="auto"><br></p>');
        }
        expect(client1.getHTML()).toEqual(client2.getHTML());
        expect(client1.getDocJSON()).toEqual(client2.getDocJSON());
        client1.stop();
        client2.stop();
      });

      it('Should sync direction of element node', async () => {
        const connector = createTestConnection(useCollabV2);
        const client1 = connector.createClient('1');
        const client2 = connector.createClient('2');
        client1.start(container!);
        client2.start(container!);

        await expectCorrectInitialContent(client1, client2);

        await waitForReact(() => {
          client1.update(() => {
            const root = $getRoot().clear();
            root.append(
              $createParagraphNode().append($createTextNode('hello')),
            );
          });
        });

        expect(client1.getHTML()).toEqual(
          '<p dir="auto"><span data-lexical-text="true">hello</span></p>',
        );
        expect(client2.getHTML()).toEqual(client1.getHTML());

        // Override direction
        await waitForReact(() => {
          client1.update(() => {
            const paragraph = $getRoot().getFirstChild<ParagraphNode>()!;
            paragraph.setDirection('rtl');
          });
        });

        expect(client1.getHTML()).toEqual(
          '<p dir="rtl"><span data-lexical-text="true">hello</span></p>',
        );
        expect(client2.getHTML()).toEqual(client1.getHTML());

        client1.stop();
        client2.stop();
      });

      it('Should allow the passing of arbitrary awareness data', async () => {
        const connector = createTestConnection(useCollabV2);

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
        const connector = createTestConnection(useCollabV2);

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
          '<p dir="auto"><span data-lexical-text="true">Hello</span></p>',
        );
        expect(client1.getHTML()).toEqual(client2.getHTML());
        expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

        await waitForReact(() => {
          // Undo the insertion of the initial paragraph and text node
          client1.getEditor().dispatchCommand(UNDO_COMMAND, undefined);
        });

        // We expect the safety check in syncYjsChangesToLexical to
        // insert a new paragraph node and prevent the document from being empty
        expect(client1.getHTML()).toEqual('<p dir="auto"><br></p>');
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
          '<p dir="auto"><br></p><p dir="auto"><span data-lexical-text="true">Hello world</span></p>',
        );
        expect(client1.getHTML()).toEqual(client2.getHTML());
        expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

        client1.stop();
        client2.stop();
      });
    },
  );

  it('Should handle multiple text nodes being normalized due to merge conflict', async () => {
    // Only applicable to Collab v1.
    const connector = createTestConnection(false);
    const client1 = connector.createClient('1');
    const client2 = connector.createClient('2');
    client1.start(container!);
    client2.start(container!);

    await expectCorrectInitialContent(client1, client2);

    client2.disconnect();

    // Add
    await waitForReact(() => {
      client1.getEditor().update(() => {
        const root = $getRoot();

        const paragraph = root.getFirstChild<ParagraphNode>()!;
        paragraph.append($createTextNode('1'));
      });
    });

    expect(client1.getHTML()).toEqual(
      '<p dir="auto"><span data-lexical-text="true">1</span></p>',
    );

    // Simulate normalization merge conflicts by inserting YMap+strings directly into Yjs.
    const yDoc = client1.getDoc();
    const rootXmlText = yDoc.get('root') as Y.XmlText;
    const paragraphXmlText = rootXmlText.toDelta()[0].insert as Y.XmlText;
    const textYMap = paragraphXmlText.toDelta()[0].insert as Y.Map<unknown>;
    yDoc.transact(() => {
      paragraphXmlText.insertEmbed(2, textYMap.clone());
      paragraphXmlText.insert(3, '2');
      paragraphXmlText.insertEmbed(4, textYMap.clone());
      paragraphXmlText.insert(5, '3');
    });

    // Note: client1 HTML won't have been updated yet here because we edited its Yjs doc directly.
    expect(client1.getHTML()).toEqual(
      '<p dir="auto"><span data-lexical-text="true">1</span></p>',
    );

    // When client2 reconnects, it will normalize the three text nodes, which syncs back to client1.
    await waitForReact(() => {
      client2.connect();
    });

    expect(client1.getHTML()).toEqual(
      '<p dir="auto"><span data-lexical-text="true">123</span></p>',
    );
    expect(client1.getHTML()).toEqual(client2.getHTML());
    expect(client1.getDocJSON()).toEqual(client2.getDocJSON());

    client1.stop();
    client2.stop();
  });
});
