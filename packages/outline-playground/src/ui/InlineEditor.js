/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, OutlineEditor} from 'outline';

import * as React from 'react';
import PlaygroundEditorContext from '../context/PlaygroundEditorContext';
import RichTextPlugin from '../plugins/RichTextPlugin';
import MentionsPlugin from '../plugins/MentionsPlugin';
import EmojisPlugin from '../plugins/EmojisPlugin';
import HashtagsPlugin from '../plugins/HashtagsPlugin';
import KeywordsPlugin from '../plugins/KeywordsPlugin';
import OnChangePlugin from '../plugins/OnChangePlugin';
import FloatingToolbarPlugin from '../plugins/FloatingToolbarPlugin';

type Props = {
  children?: React$Node,
  controlled: boolean,
  onChange?: (editorState: EditorState, editor: OutlineEditor) => void,
  placeholder?: string,
};

export default function InlineEditor({
  children,
  controlled,
  onChange,
  placeholder,
}: Props): React$Node {
  return (
    <div className="inline-editor-container">
      <PlaygroundEditorContext>
        {onChange && <OnChangePlugin onChange={onChange} />}
        <MentionsPlugin />
        <EmojisPlugin />
        <HashtagsPlugin />
        <KeywordsPlugin />
        {controlled ? children : <RichTextPlugin placeholder={placeholder} />}
        <FloatingToolbarPlugin />
      </PlaygroundEditorContext>
    </div>
  );
}
