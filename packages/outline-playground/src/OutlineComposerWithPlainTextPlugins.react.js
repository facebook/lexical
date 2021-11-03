/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import * as React from 'react';
import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import OutlineComposer from 'outline-react/OutlineComposer.react';

import createPlainTextActionButtonsPlugin from './plugins/createPlainTextActionButtonsPlugin';
import createMentionsPlugin from './plugins/createMentionsPlugin';
import createEmojiPlugin from './plugins/createEmojiPlugin';
import createTreeViewPlugin from './plugins/createTreeViewPlugin';
import createPlainTextPlugin from './plugins/createPlainTextPlugin';

/**
 * TODO:
 * - Finish adding plugins for plain text: hashtags, keywords
 * - Add support for rich vs plain text as a plugin
 * - Add tooling to prevent obvious mistakes like simultaneously providing rich and plain text plugins
 */

function OutlineComposerWithPlainTextPlugins({
  showTreeView,
}: {
  showTreeView: boolean,
}): React$Node {
  // TODO: Should this be useStable for the render ref instead?
  const treeViewRenderRef = useRef(document.createElement('div'));
  const treeViewRootRef = useRef();

  // TODO: Consider baking this into OutlineComposer and making setIsReadOnly available via outlinePluginProps
  const [isReadOnly, setIsReadOnly] = useState(false);

  useLayoutEffect(() => {
    const treeViewRootNode = treeViewRootRef.current;
    const treeViewRenderNode = treeViewRenderRef.current;
    if (treeViewRenderNode != null && treeViewRootNode != null) {
      treeViewRootNode.appendChild(treeViewRenderNode);
      return () => {
        treeViewRootNode.removeChild(treeViewRenderNode);
      };
    }
  }, []);

  const treeViewRenderNode = treeViewRenderRef.current;

  const plugins = useMemo(
    () => [
      createPlainTextPlugin(),
      createEmojiPlugin(),
      createMentionsPlugin(),
      showTreeView ? createTreeViewPlugin(treeViewRenderNode) : null,
      createPlainTextActionButtonsPlugin(isReadOnly, setIsReadOnly),
    ],
    [isReadOnly, showTreeView, treeViewRenderNode],
  );

  return (
    <>
      <OutlineComposer plugins={plugins} isReadOnly={isReadOnly} />
      <div ref={treeViewRootRef} />
    </>
  );
}

export default OutlineComposerWithPlainTextPlugins;
