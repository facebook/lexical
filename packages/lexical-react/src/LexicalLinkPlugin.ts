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
