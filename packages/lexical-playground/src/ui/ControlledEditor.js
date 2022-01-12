/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, LexicalEditor, EditorStateRef} from 'lexical';

import * as React from 'react';

import MentionsPlugin from '../plugins/MentionsPlugin';
import EmojisPlugin from '../plugins/EmojisPlugin';
import HashtagsPlugin from '@lexical/react/LexicalHashtagPlugin';
import KeywordsPlugin from '../plugins/KeywordsPlugin';
import OnChangePlugin from '../plugins/OnChangePlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import TablesPlugin from '@lexical/react/LexicalTablePlugin';
import TableCellActionMenuPlugin from '@lexical/react/LexicalTableActionMenuPlugin';
import ImagesPlugin from '../plugins/ImagesPlugin';
import LinkPlugin from '@lexical/react/LexicalLinkPlugin';

type Props = {
  children: React$Node,
  onChange?: (editorState: EditorState, editor: LexicalEditor) => void,
  placeholder?: string,
  initialEditorStateRef?: EditorStateRef,
};

export default function ControlledEditor({
  children,
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
        <LinkPlugin />
        <EmojisPlugin />
        <HashtagsPlugin />
        <KeywordsPlugin />
        {children}
      </LexicalComposer>
    </div>
  );
}
