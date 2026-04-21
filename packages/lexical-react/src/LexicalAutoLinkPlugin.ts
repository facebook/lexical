/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ChangeHandler, LinkMatcher} from '@lexical/link';
import type {ElementNode, LexicalEditor} from 'lexical';
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
  excludeParents?: Array<(parent: ElementNode) => boolean>,
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
      excludeParents: excludeParents ?? [],
      matchers,
    });
  }, [editor, matchers, onChange, excludeParents]);
}

export function AutoLinkPlugin({
  matchers,
  onChange,
  excludeParents,
}: {
  matchers: Array<LinkMatcher>;
  onChange?: ChangeHandler;
  excludeParents?: Array<(parent: ElementNode) => boolean>;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useAutoLink(editor, matchers, onChange, excludeParents);

  return null;
}
