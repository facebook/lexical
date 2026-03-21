/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './styles.css';

import {AutoFocusExtension} from '@lexical/extension';
import {HashtagExtension} from '@lexical/hashtag';
import {HistoryExtension} from '@lexical/history';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {$getRoot, defineExtension} from 'lexical';
import {useEffect, useState} from 'react';

const richInputTheme = {
  hashtag: 'ri-hashtag',
  paragraph: 'ri-paragraph',
  text: {
    bold: 'ri-text-bold',
    italic: 'ri-text-italic',
    underline: 'ri-text-underline',
  },
};

const richInputExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    HashtagExtension,
    AutoFocusExtension,
  ],
  name: '@lexical/website/rich-input-editor',
  namespace: '@lexical/website/rich-input-editor',
  theme: richInputTheme,
});

function CharacterCountPlugin({setCount}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      editorState.read(() => {
        setCount($getRoot().getTextContent().length);
      });
    });
  }, [editor, setCount]);

  return null;
}

export default function RichInputEditor() {
  const [characterCount, setCharacterCount] = useState(0);
  const [modKey, setModKey] = useState('⌘ + ');

  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      !navigator.userAgent.includes('Mac') &&
      !navigator.userAgent.includes('iPhone') &&
      !navigator.userAgent.includes('iPad')
    ) {
      setModKey('Ctrl + ');
    }
  }, []);

  return (
    <LexicalExtensionComposer extension={richInputExtension}>
      <div className="ri-shell">
        <div className="ri-editor-wrap">
          <ContentEditable
            className="ri-editor"
            aria-placeholder="How are you feeling? Use #hashtags too."
            placeholder={
              <div className="ri-placeholder">
                How are you feeling? Use #hashtags too.
              </div>
            }
          />
        </div>
        <div className="ri-footer">
          <div className="ri-shortcuts">
            <span className="ri-shortcut">
              <kbd>{modKey}B</kbd> Bold
            </span>
            <span className="ri-shortcut">
              <kbd>{modKey}I</kbd> Italic
            </span>
            <span className="ri-shortcut">
              <kbd>{modKey}U</kbd> Underline
            </span>
          </div>
          <span className="ri-count">{characterCount}</span>
        </div>
        <CharacterCountPlugin setCount={setCharacterCount} />
      </div>
    </LexicalExtensionComposer>
  );
}
