/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, LexicalEditor, EditorStateRef} from 'lexical';

import * as React from 'react';

import RichTextPlugin from '../plugins/RichTextPlugin';
import MentionsPlugin from '../plugins/MentionsPlugin';
import EmojisPlugin from '../plugins/EmojisPlugin';
import HashtagsPlugin from 'lexical-react/HashtagsPlugin';
import KeywordsPlugin from '../plugins/KeywordsPlugin';
import OnChangePlugin from '../plugins/OnChangePlugin';
import LexicalComposer from 'lexical-react/LexicalComposer';
import TablesPlugin from '../plugins/TablesPlugin';
import TableCellActionMenuPlugin from '../plugins/TableCellActionMenuPlugin';
import ImagesPlugin from '../plugins/ImagesPlugin';
import LinksPlugin from '../plugins/LinksPlugin';

type Props = {
  children?: React$Node,
  controlled: boolean,
  onChange?: (editorState: EditorState, editor: LexicalEditor) => void,
  placeholder?: string,
  initialEditorStateRef?: EditorStateRef,
};

export default function InlineRichEditor({
  children,
  controlled,
  onChange,
  placeholder,
  initialEditorStateRef,
}: Props): React$Node {
  return (
    <div className="inline-editor-container">
      <LexicalComposer initialEditorStateRef={initialEditorStateRef}>
        {onChange && <OnChangePlugin onChange={onChange} />}
        <MentionsPlugin />
        <TablesPlugin />
        <TableCellActionMenuPlugin />
        <ImagesPlugin />
        <LinksPlugin />
        <EmojisPlugin />
        <HashtagsPlugin />
        <KeywordsPlugin />
        {controlled ? children : <RichTextPlugin placeholder={placeholder} />}
      </LexicalComposer>
    </div>
  );
}
