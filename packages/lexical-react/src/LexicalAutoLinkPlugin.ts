/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalEditor} from 'lexical';

import invariant from '@lexical/internal/invariant';
import {
  AutoLinkNode,
  type ChangeHandler,
  type LinkMatcher,
  registerAutoLink,
} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type JSX, useEffect} from 'react';

export {
  type ChangeHandler,
  createLinkMatcherWithRegExp,
  type LinkMatcher,
} from '@lexical/link';

function useAutoLink(
  editor: LexicalEditor,
  matchers: LinkMatcher[],
  onChange?: ChangeHandler,
  excludeParents?: ((parent: ElementNode) => boolean)[],
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

/**
 * Automatically converts text that matches one of the provided `matchers` into
 * {@link AutoLinkNode}s as the user types, and reverts them back to plain text
 * when they no longer match. Provide `onChange` to react to links being
 * created, updated, or removed, and `excludeParents` to skip matching inside
 * particular ancestor nodes. The editor must have the {@link AutoLinkNode}
 * registered.
 *
 * This is a legacy plugin. When building an editor with the extension API,
 * configure {@link AutoLinkExtension} instead.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function AutoLinkPlugin({
  matchers,
  onChange,
  excludeParents,
}: {
  matchers: LinkMatcher[];
  onChange?: ChangeHandler;
  excludeParents?: ((parent: ElementNode) => boolean)[];
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useAutoLink(editor, matchers, onChange, excludeParents);

  return null;
}
