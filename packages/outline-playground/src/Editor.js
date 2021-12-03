/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import PlainTextPlugin from './plugins/PlainTextPlugin';
import RichTextPlugin from './plugins/RichTextPlugin';
import RichTextCollabPlugin from './plugins/RichTextCollabPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import CharacterLimitPlugin from './plugins/CharacterLimitPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import HashtagsPlugin from './plugins/HashtagsPlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutoFormatterPlugin from './plugins/AutoFormatterPlugin';
import BlockControlsPlugin from './plugins/BlockControlsPlugin';
import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin';
import OutlineComposer from '../../outline-react/src/composer/OutlineComposer';
import PlaygroundEditorTheme from './PlaygroundEditorTheme';

type Props = {
  isCollab: boolean,
  isCharLimit: boolean,
  isCharLimitUtf8: boolean,
  isAutocomplete: boolean,
  isRichText: boolean,
};

export default function Editor({
  isCollab,
  isAutocomplete,
  isCharLimit,
  isCharLimitUtf8,
  isRichText,
}: Props): React$Node {
  return (
    <div className="editor-container">
      <OutlineComposer theme={PlaygroundEditorTheme}>
        <MentionsPlugin />
        <EmojisPlugin />
        <HashtagsPlugin />
        <KeywordsPlugin />
        {isRichText ? (
          <>
            {isCollab ? <RichTextCollabPlugin id="main" /> : <RichTextPlugin />}
            <AutoFormatterPlugin />
            <BlockControlsPlugin />
            <FloatingToolbarPlugin />
          </>
        ) : (
          <PlainTextPlugin />
        )}
        {(isCharLimit || isCharLimitUtf8) && (
          <CharacterLimitPlugin charset={isCharLimit ? 'UTF-16' : 'UTF-8'} />
        )}
        {isAutocomplete && <AutocompletePlugin />}
        <ActionsPlugin isRichText={isRichText} />
      </OutlineComposer>
    </div>
  );
}
