/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import * as Y from 'yjs';

import {CollaborationPlugin} from '../../LexicalCollaborationPlugin';
import {LexicalComposer} from '../../LexicalComposer';
import {ContentEditable} from '../../LexicalContentEditable';
import {LexicalErrorBoundary} from '../../LexicalErrorBoundary';
import {RichTextPlugin} from '../../LexicalRichTextPlugin';

describe(`LexicalCollaborationPlugin`, () => {
  let container: HTMLDivElement;
  let reactRoot: Root;

  const editorConfig = Object.freeze({
    // NOTE: This is critical for collaboration plugin to set editor state to null. It
    // would indicate that the editor should not try to set any default state
    // (not even empty one), and let collaboration plugin do it instead
    editorState: null,
    namespace: 'Test editor',
    nodes: [],
    // Handling of errors during update
    onError(error: Error) {
      throw error;
    },
  });

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  test(`providerFactory called only once`, () => {
    const providerFactory = jest.fn(
      (id: string, yjsDocMap: Map<string, Y.Doc>) => {
        const doc = new Y.Doc();
        yjsDocMap.set(id, doc);

        return {
          awareness: {
            getLocalState: () => null,
            getStates: () => new Map(),
            off: () => {},
            on: () => {},
            setLocalState: () => {},
          },
          connect: () => {},
          disconnect: () => {},
          off: () => {},
          on: () => {},
        };
      },
    );
    function MemoComponent() {
      return (
        <LexicalComposer initialConfig={editorConfig}>
          {/* With CollaborationPlugin - we MUST NOT use @lexical/react/LexicalHistoryPlugin */}
          <CollaborationPlugin
            id="lexical/react-rich-collab"
            providerFactory={providerFactory}
            // Unless you have a way to avoid race condition between 2+ users trying to do bootstrap simultaneously
            // you should never try to bootstrap on client. It's better to perform bootstrap within Yjs server.
            shouldBootstrap={false}
          />
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={
              <div className="editor-placeholder">Enter some rich text...</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }
    ReactTestUtils.act(() => {
      reactRoot.render(
        <React.StrictMode>
          <MemoComponent />
        </React.StrictMode>,
      );
    });

    expect(providerFactory).toHaveBeenCalledTimes(1);
  });
});
