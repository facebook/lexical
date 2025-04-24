/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use client';

import {$generateHtmlFromNodes} from '@lexical/html';
import {
  LexicalSubscription,
  useLexicalSubscription,
} from '@lexical/react/useLexicalSubscription';
import {LexicalEditor} from 'lexical';
import * as prettier from 'prettier';
import * as prettierHtml from 'prettier/plugins/html';
import {useEffect, useState} from 'react';

function editorHTML(editor: LexicalEditor): string {
  return editor
    .getEditorState()
    .read(() => $generateHtmlFromNodes(editor, null), {editor});
}

function htmlSubscription(editor: LexicalEditor): LexicalSubscription<string> {
  return {
    initialValueFn: () => editorHTML(editor),
    subscribe: (callback) =>
      editor.registerUpdateListener(({editorState, prevEditorState}) => {
        if (editorState !== prevEditorState) {
          callback(editorHTML(editor));
        }
      }),
  };
}

export function HTMLViewPlugin() {
  const rawHtml = useLexicalSubscription(htmlSubscription);
  const [html, setHtml] = useState('');
  useEffect(() => {
    let handler = setHtml;
    prettier
      .format(rawHtml, {parser: 'html', plugins: [prettierHtml]})
      .then((formatted) => handler(formatted));
    return () => {
      handler = () => {};
    };
  }, [rawHtml]);
  return (
    <pre style={{border: '1px solid lightgray', padding: '10px'}}>{html}</pre>
  );
}
