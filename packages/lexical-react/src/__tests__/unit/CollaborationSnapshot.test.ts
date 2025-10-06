/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getYChangeState,
  CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
  DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKeyOrThrow,
  $getRoot,
  LexicalEditor,
  MutationListener,
  ParagraphNode,
  TextNode,
} from 'lexical';
import {expectHtmlToBeEqual, html} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, it} from 'vitest';
import * as Y from 'yjs';

import {Client, createTestConnection, waitForReact} from './utils';

describe('CollaborationSnapshot', () => {
  let container: null | HTMLDivElement = null;
  let client1: Client;
  let client2: Client;
  let editor1: LexicalEditor;
  let editor2: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const connector = createTestConnection(true);
    client1 = connector.createClient('1');
    client2 = connector.createClient('2');
    client1.start(container!);
    client2.start(container!);
    editor1 = client1.getEditor();
    editor2 = client2.getEditor();

    const mutationListener: MutationListener = (mutations) => {
      editor1.getEditorState().read(() => {
        for (const [nodeKey, mutation] of mutations) {
          if (mutation === 'destroyed') {
            continue;
          }
          const element = editor1.getElementByKey(nodeKey);
          if (!element) {
            continue;
          }
          element.classList.remove('removed', 'added');
          const node = $getNodeByKeyOrThrow<TextNode>(nodeKey);
          const ychange = $getYChangeState<void>(node);
          if (!ychange) {
            continue;
          }
          const {type} = ychange;
          switch (type) {
            case 'removed':
              element.classList.add('y-removed');
              break;
            case 'added':
              element.classList.add('y-added');
              break;
            default:
            // no change
          }
        }
      });
    };

    editor1.registerMutationListener(TextNode, mutationListener);
    editor1.registerMutationListener(ParagraphNode, mutationListener);
  });

  afterEach(() => {
    client1.stop();
    client2.stop();
    document.body.removeChild(container!);
    container = null;
  });

  describe('DIFF_VERSIONS_COMMAND', () => {
    it('should diff between two snapshots', async () => {
      editor1.update(
        () => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append($createTextNode('ABC')),
              $createParagraphNode().append(
                $createTextNode('Removed between snapshots'),
              ),
              $createParagraphNode().append(
                $createTextNode('Removed before prevSnapshot'),
              ),
            );
        },
        {discrete: true},
      );

      editor1.update(
        () => {
          $getRoot().getChildAtIndex<ParagraphNode>(2)!.remove();
        },
        {discrete: true},
      );

      const prevSnapshot = Y.snapshot(client1.getDoc());

      editor1.update(
        () => {
          const paragraph = $getRoot().getChildAtIndex<ParagraphNode>(0)!;
          paragraph.getChildAtIndex<TextNode>(0)!.spliceText(2, 1, '123');
          $getRoot().getChildAtIndex<ParagraphNode>(1)!.remove();
        },
        {discrete: true},
      );

      const snapshot = Y.snapshot(client1.getDoc());

      editor1.update(
        () => {
          const paragraph = $getRoot().getChildAtIndex<ParagraphNode>(0)!;
          paragraph.append($createTextNode('!'));
        },
        {discrete: true},
      );

      await waitForReact(() =>
        editor1.dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {
          prevSnapshot,
          snapshot,
        }),
      );

      expectHtmlToBeEqual(
        client1.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">AB</span>
            <span class="y-removed" data-lexical-text="true">C</span>
            <span class="y-added" data-lexical-text="true">123</span>
          </p>
          <p class="y-removed" dir="auto">
            <span class="y-removed" data-lexical-text="true">
              Removed between snapshots
            </span>
          </p>
        `,
      );

      expectHtmlToBeEqual(
        client2.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">AB123!</span>
          </p>
        `,
      );
    });

    it('should diff from start of time if no prevSnapshot is provided', async () => {
      editor1.update(
        () => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('Hello'));
        },
        {discrete: true},
      );
      const snapshot = Y.snapshot(client1.getDoc());

      // Another update that will not be in the snapshot
      editor1.update(
        () => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode(' world'));
        },
        {discrete: true},
      );

      await waitForReact(() =>
        editor1.dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {
          snapshot,
        }),
      );

      expectHtmlToBeEqual(
        client1.getHTML(),
        html`
          <p class="y-added" dir="auto">
            <span class="y-added" data-lexical-text="true">Hello</span>
          </p>
        `,
      );

      expectHtmlToBeEqual(
        client2.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">Hello world</span>
          </p>
        `,
      );
    });

    it('should diff to latest state if no snapshot is provided', async () => {
      editor1.update(
        () => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('Hello'));
        },
        {discrete: true},
      );
      const prevSnapshot = Y.snapshot(client1.getDoc());

      editor1.update(
        () => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode(' world'));
        },
        {discrete: true},
      );

      await waitForReact(() =>
        editor1.dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {
          prevSnapshot,
        }),
      );

      expectHtmlToBeEqual(
        client1.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">Hello</span>
            <span class="y-added" data-lexical-text="true">world</span>
          </p>
        `,
      );

      expectHtmlToBeEqual(
        client2.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">Hello world</span>
          </p>
        `,
      );
    });

    it('should ignore changes from other clients while in diff mode', async () => {
      await waitForReact(() => {
        editor1.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('ABC'));
        });
      });

      const snapshot = Y.snapshot(client1.getDoc());

      await waitForReact(() =>
        editor1.dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {
          snapshot,
        }),
      );

      await waitForReact(() => {
        editor2.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('XYZ'));
        });
      });

      expectHtmlToBeEqual(
        client1.getHTML(),
        html`
          <p class="y-added" dir="auto">
            <span class="y-added" data-lexical-text="true">ABC</span>
          </p>
        `,
      );

      expectHtmlToBeEqual(
        client2.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">ABCXYZ</span>
          </p>
        `,
      );
    });

    it('should not sync changes to yjs while in diff mode', async () => {
      await waitForReact(() => {
        editor1.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('ABC'));
        });
      });

      const snapshot = Y.snapshot(client1.getDoc());

      await waitForReact(() =>
        editor1.dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {
          snapshot,
        }),
      );

      await waitForReact(() => {
        editor1.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('!'));
        });
      });

      expectHtmlToBeEqual(
        client1.getHTML(),
        html`
          <p class="y-added" dir="auto">
            <span class="y-added" data-lexical-text="true">ABC</span>
            <span data-lexical-text="true">!</span>
          </p>
        `,
      );

      expectHtmlToBeEqual(
        client2.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">ABC</span>
          </p>
        `,
      );
    });
  });

  describe('CLEAR_DIFF_VERSIONS_COMMAND', () => {
    it('recover editor state after clear diff versions command', async () => {
      await waitForReact(() => {
        editor1.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('ABC'));
        });
      });

      const snapshot = Y.snapshot(client1.getDoc());

      await waitForReact(() =>
        editor1.dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {
          snapshot,
        }),
      );

      await waitForReact(() => {
        editor2.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('XYZ'));
        });
      });

      await waitForReact(() =>
        editor1.dispatchCommand(
          CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
          undefined,
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expectHtmlToBeEqual(
        client1.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">ABCXYZ</span>
          </p>
        `,
      );
      expectHtmlToBeEqual(client1.getHTML(), client2.getHTML());

      // Ensure that updates after synced again.
      await waitForReact(() => {
        editor1.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('!'));
        });
      });

      await waitForReact(() => {
        editor2.update(() => {
          const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
          paragraph.append($createTextNode('?'));
        });
      });

      expectHtmlToBeEqual(
        client1.getHTML(),
        html`
          <p dir="auto">
            <span data-lexical-text="true">ABCXYZ!?</span>
          </p>
        `,
      );
      expectHtmlToBeEqual(client1.getHTML(), client2.getHTML());
    });
  });
});
