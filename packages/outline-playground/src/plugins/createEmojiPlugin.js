/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineComposerPlugin} from 'outline-react/OutlineComposer.react';

import useEmojis from './../useEmojis';

function EmojiPluginComponent({outlineProps: {editor}}): React$Node {
  useEmojis(editor);
  return null;
}

function createEmojiPlugin(): OutlineComposerPlugin<null> {
  return {
    name: 'emoji',
    component: EmojiPluginComponent,
    props: null,
  };
}

export default createEmojiPlugin;
