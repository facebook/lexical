/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, OutlineEditor, EditorStateRef} from 'outline';

import * as React from 'react';

import RichTextPlugin from '../plugins/RichTextPlugin';
import MentionsPlugin from '../plugins/MentionsPlugin';
import EmojisPlugin from '../plugins/EmojisPlugin';
import HashtagsPlugin from 'outline-react/HashtagsPlugin';
import KeywordsPlugin from '../plugins/KeywordsPlugin';
import OnChangePlugin from '../plugins/OnChangePlugin';
import OutlineComposer from 'outline-react/OutlineComposer';
import TablesPlugin from '../plugins/TablesPlugin';
import TableCellActionMenuPlugin from '../plugins/TableCellActionMenuPlugin';
import ImagesPlugin from '../plugins/ImagesPlugin';
import LinksPlugin from '../plugins/LinksPlugin';

type Props = {
  children?: React$Node,
  controlled: boolean,
  onChange?: (editorState: EditorState, editor: OutlineEditor) => void,
  placeholder?: string,
  initialEditorStateRef?: EditorStateRef,
};

export default function InlineEditor({
  children,
  controlled,
  onChange,
  placeholder,
  initialEditorStateRef,
}: Props): React$Node {
  return (
    <div className="inline-editor-container">
      <OutlineComposer initialEditorStateRef={initialEditorStateRef}>
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
      </OutlineComposer>
    </div>
  );
}
