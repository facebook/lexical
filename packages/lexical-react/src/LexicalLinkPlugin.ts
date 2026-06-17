/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {namedSignals} from '@lexical/extension';
import {type LinkAttributes, LinkNode, registerLink} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

type Props = {
  validateUrl?: (url: string) => boolean;
  attributes?: LinkAttributes;
};

/**
 * Enables {@link LinkNode} support, registering the commands and transforms
 * that toggle and normalize links. Pass `validateUrl` to restrict which URLs
 * may be applied (which also enables automatic link creation when pasting a
 * matching URL) and `attributes` to set defaults such as `target` or `rel`.
 * The editor must have the {@link LinkNode} registered.
 *
 * This is a legacy plugin. When building an editor with the extension API,
 * configure {@link LinkExtension} instead.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function LinkPlugin({validateUrl, attributes}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([LinkNode])) {
      throw new Error('LinkPlugin: LinkNode not registered on editor');
    }
  });
  useEffect(() => {
    return registerLink(editor, namedSignals({attributes, validateUrl}));
  }, [editor, validateUrl, attributes]);

  return null;
}
