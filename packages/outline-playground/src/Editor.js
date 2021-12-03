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
import EmojisPlugin from 'outline-react/EmojisPlugin';
import CharacterLimitPlugin from 'outline-react/CharacterLimitPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import HashtagsPlugin from 'outline-react/HashtagsPlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutoFormatterPlugin from 'outline-react/AutoFormatterPlugin';
import BlockControlsPlugin from 'outline-react/BlockControlsPlugin';
import FloatingToolbarPlugin from 'outline-react/FloatingToolbarPlugin';

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
    </div>
  );
}
