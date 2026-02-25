/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {TreeView} from '@lexical/react/LexicalTreeView';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {useExtensionDependency} from '@lexical/react/useExtensionComponent';
import {defineExtension} from 'lexical';

export type TreeViewConfig = Omit<Parameters<typeof TreeView>[0], 'editor'>;
export function TreeViewExtensionComponent(
  props: Partial<TreeViewConfig>,
): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    <TreeView
      editor={editor}
      {...useExtensionDependency(TreeViewExtension).config}
      {...props}
    />
  );
}

const config: TreeViewConfig = {
  timeTravelButtonClassName: 'debug-timetravel-button',
  timeTravelPanelButtonClassName: 'debug-timetravel-panel-button',
  timeTravelPanelClassName: 'debug-timetravel-panel',
  timeTravelPanelSliderClassName: 'debug-timetravel-panel-slider',
  treeTypeButtonClassName: 'debug-treetype-button',
  viewClassName: 'tree-view-output',
};

/**
 * Provides a configured TreeView debugging tool (React dependent)
 * as an output component with configurable class names.
 */
export const TreeViewExtension = defineExtension({
  build: () => ({Component: TreeViewExtensionComponent}),
  config,
  dependencies: [ReactExtension],
  name: '@lexical/react/TreeView',
});
