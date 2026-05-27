/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  type CanIndentPredicate,
  registerTabIndentation,
} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

export {registerTabIndentation};

/**
 * This plugin adds the ability to indent content using the tab key. Generally, we don't
 * recommend using this plugin as it could negatively affect accessibility for keyboard
 * users, causing focus to become trapped within the editor.
 */
export function TabIndentationPlugin({
  maxIndent,
  $canIndent,
  releaseOnEscape,
}: {
  maxIndent?: number;
  /**
   * By default, indents are set on all elements for which the {@link ElementNode.canIndent} returns true.
   * This option allows you to set indents for specific nodes without overriding the method for others.
   */
  $canIndent?: CanIndentPredicate;
  /**
   * When true, pressing Escape inside the editor sets a one-shot release so
   * that the next Tab falls through to the browser's default focus
   * navigation. WCAG 2.1.2 escape hatch for keyboard-only users.
   */
  releaseOnEscape?: boolean;
}): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerTabIndentation(editor, maxIndent, $canIndent, {
      releaseOnEscape,
    });
  }, [editor, maxIndent, $canIndent, releaseOnEscape]);

  return null;
}
