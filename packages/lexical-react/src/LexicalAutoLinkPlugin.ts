/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ChangeHandler, LinkMatcher} from '@lexical/link';
import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {AutoLinkNode, registerAutoLink} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';
import invariant from 'shared/invariant';

export {
  type ChangeHandler,
  createLinkMatcherWithRegExp,
  type LinkMatcher,
} from '@lexical/link';

function useAutoLink(
  editor: LexicalEditor,
  matchers: Array<LinkMatcher>,
  onChange?: ChangeHandler,
): void {
  useEffect(() => {
    if (!editor.hasNodes([AutoLinkNode])) {
      invariant(
        false,
        'LexicalAutoLinkPlugin: AutoLinkNode not registered on editor',
      );
    }
  });
  useEffect(() => {
    return registerAutoLink(editor, {
      changeHandlers: onChange ? [onChange] : [],
      matchers,
    });
  }, [editor, matchers, onChange]);
}

export function AutoLinkPlugin({
  matchers,
  onChange,
}: {
  matchers: Array<LinkMatcher>;
  onChange?: ChangeHandler;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useAutoLink(editor, matchers, onChange);

  return null;
}
