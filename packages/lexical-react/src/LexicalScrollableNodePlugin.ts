/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isTableNode,
  registerScrollableNodeTransform,
  type ScrollableNodeConfig,
  TableNode,
} from '@lexical/table';
import {useEffect} from 'react';

import {useLexicalComposerContext} from './LexicalComposerContext';

export const tableNodeConfig: ScrollableNodeConfig = {
  $isScrollableChild: $isTableNode,
  scrollableChildNodes: [TableNode],
};

export function ScrollableNodePlugin({
  config = tableNodeConfig,
}: {
  config?: ScrollableNodeConfig;
}): null {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () => registerScrollableNodeTransform(editor, config),
    [editor, config],
  );
  return null;
}
