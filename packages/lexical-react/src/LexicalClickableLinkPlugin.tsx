/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {namedSignals} from '@lexical/extension';
import {registerClickableLink} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

/**
 * Makes {@link LinkNode}s clickable, navigating to the link's URL when it is
 * clicked (opening it in a new tab when `newTab` is `true`, the default). Set
 * `disabled` to temporarily turn the behavior off, for example while editing.
 *
 * This is a legacy plugin. When building an editor with the extension API,
 * configure {@link ClickableLinkExtension} instead.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function ClickableLinkPlugin({
  newTab = true,
  disabled = false,
}: {
  newTab?: boolean;
  disabled?: boolean;
}): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerClickableLink(editor, namedSignals({disabled, newTab}));
  }, [editor, newTab, disabled]);

  return null;
}
