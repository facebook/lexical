/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  LexicalSubscription,
  useLexicalSubscription,
} from '@lexical/react/useLexicalSubscription';
import {EditorState, LexicalEditor} from 'lexical';

function editorStateJSON(editorState: EditorState): string {
  return JSON.stringify(editorState.toJSON(), null, 2);
}

function jsonSubscription(editor: LexicalEditor): LexicalSubscription<string> {
  return {
    initialValueFn: () => editorStateJSON(editor.getEditorState()),
    subscribe: (callback) =>
      editor.registerUpdateListener(({editorState, prevEditorState}) => {
        if (editorState !== prevEditorState) {
          callback(editorStateJSON(editorState));
        }
      }),
  };
}

export function JSONViewPlugin() {
  const json = useLexicalSubscription(jsonSubscription);
  return (
    <pre style={{border: '1px solid lightgray', padding: '10px'}}>{json}</pre>
  );
}
