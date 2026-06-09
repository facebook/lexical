/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use client';

import {AutoFocusExtension} from '@lexical/extension';
import {withDOM} from '@lexical/headless/dom';
import {HistoryExtension} from '@lexical/history';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';

import ExampleTheme from './ExampleTheme';
import {CodeShikiDemoExtension} from './extensions/CodeShikiDemoExtension';

const editorExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    AutoFocusExtension,
    CodeShikiDemoExtension,
  ],
  name: '@lexical/nextjs-code-shiki-example/Editor',
  namespace: '@lexical/nextjs-code-shiki-example',
  theme: ExampleTheme,
});

function SSRContentEditable() {
  const [editor] = useLexicalComposerContext();
  return (
    <div
      className="editor-input"
      suppressHydrationWarning={true}
      ref={editor.setRootElement.bind(editor)}
      dangerouslySetInnerHTML={{
        __html:
          typeof window === 'undefined'
            ? withDOM(() => {
                const root = document.createElement('div');
                editor.setRootElement(root);
                const {innerHTML} = root;
                editor.setRootElement(null);
                return innerHTML;
              })
            : '',
      }}
    />
  );
}

export default function EditorClient() {
  return (
    <div className="editor-container">
      <div className="editor-inner">
        <LexicalExtensionComposer
          extension={editorExtension}
          contentEditable={<SSRContentEditable />}
        />
      </div>
    </div>
  );
}
