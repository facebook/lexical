/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  OutlineComposerPlugin,
  OutlineComposerPluginProps,
} from 'outline-react/OutlineComposer.react';

import * as React from 'react';
import {useMemo} from 'react';
import OutlineComposer from 'outline-react/OutlineComposer.react';
import useEmojis from './useEmojis';
import OutlineTreeView from 'outline-react/OutlineTreeView';

function EmojiPluginComponent({
  editor,
}: OutlineComposerPluginProps): React$Node {
  useEmojis(editor);
  return null;
}

const EmojiPlugin: OutlineComposerPlugin = {
  name: 'emoji',
  component: EmojiPluginComponent,
};

const TreeViewPlugin: OutlineComposerPlugin = {
  name: 'tree-view',
  component: ({editor}: OutlineComposerPluginProps) => (
    <OutlineTreeView className="tree-view-output" editor={editor} />
  ),
};

function OutlineComposerWithPlugins(): React$Node {
  const plugins = useMemo(() => [EmojiPlugin, TreeViewPlugin], []);
  return <OutlineComposer plugins={plugins} />;
}

export default OutlineComposerWithPlugins;
