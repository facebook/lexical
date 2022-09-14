/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection} from 'lexical';
import useLayoutEffect from 'shared/useLayoutEffect';

type Props = Readonly<{
  scrollRef: {
    current: HTMLElement | null;
  };
}>;

export function AutoScrollPlugin({scrollRef}: Props): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    return editor.registerUpdateListener(({tags, editorState}) => {
      const scrollElement = scrollRef.current;

      if (scrollElement === null || !tags.has('scroll-into-view')) {
        return;
      }

      const selection = editorState.read(() => $getSelection());

      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        return;
      }

      const anchorElement = editor.getElementByKey(selection.anchor.key);

      if (anchorElement === null) {
        return;
      }

      const scrollRect = scrollElement.getBoundingClientRect();
      const rect = anchorElement.getBoundingClientRect();

      if (rect.bottom > scrollRect.bottom) {
        anchorElement.scrollIntoView(false);
      } else if (rect.top < scrollRect.top) {
        anchorElement.scrollIntoView();
      }
    });
  }, [editor, scrollRef]);

  return null;
}
