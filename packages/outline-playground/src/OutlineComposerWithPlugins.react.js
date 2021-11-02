/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  OutlineComposerPlugin,
  OutlineComposerPluginProps,
} from 'outline-react/OutlineComposer.react';

import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import OutlineComposer from 'outline-react/OutlineComposer.react';
import useEmojis from './useEmojis';
import OutlineTreeView from 'outline-react/OutlineTreeView';
// $FlowFixMe[cannot-resolve-module] This should be available
import {createPortal} from 'react-dom';

/**
 * TODO:
 * We need to create a way to pass in data at render time to the plugins. In the case
 * of the action buttons component we need to pass in the ref to the portal root.
 * Use the same pattern as the UFI: all plugins should be created with a `create...Plugin` function.
 * For Emojis there are no arguments, and no additional props for the EmojiPluginComponent.
 *
 * But for ActionButtonsComponent its createActionButtonPlugin function will take an argument for the ref
 * and then specify that as props in the plugin config, to be passed to the component when it's actually rendered.
 *
 *
 * --
 * Scratch most of that. Just need to pass props.
 * Pass outline props as pluginProps, so they don't conflict with whatever other random props
 * And figure out this fucking exact/inexact/parameter thing once and for all
 */

function ActionButtonsComponent({
  outlineProps: {editor, clearEditor},
}): React$Node {
  const elementRef = useRef();
  console.log(elementRef);

  useEffect(() => {
    elementRef.current = document.getElementById('composer-actions-root');
  });

  return elementRef.current == null
    ? null
    : createPortal(
        <button
          className="action-button clear"
          onClick={() => {
            clearEditor();
            editor.focus();
          }}>
          Clear
        </button>,
        document.getElementById('composer-actions-root'),
      );
}

const ActionButtonsPlugin: OutlineComposerPlugin<null> = {
  name: 'action-buttons',
  component: ActionButtonsComponent,
  props: null,
};

function EmojiPluginComponent({
  outlineProps: {editor: OutlineComposerPluginProps},
}): React$Node {
  return null;
}

const EmojiPlugin: OutlineComposerPlugin<null> = {
  name: 'emoji',
  component: EmojiPluginComponent,
  props: null,
};

function TreeViewComponent({outlineProps: {editor}}): React$Node {
  return <OutlineTreeView className="tree-view-output" editor={editor} />;
}

const TreeViewPlugin: OutlineComposerPlugin<null> = {
  name: 'tree-view',
  component: TreeViewComponent,
  props: null,
};

function OutlineComposerWithPlugins(): React$Node {
  const actionsRootRef = useRef(React.createRef());

  const plugins = useMemo(
    () => [
      EmojiPlugin,
      TreeViewPlugin,
      {
        name: 'action-buttons',
        component: ActionButtonsComponent,
        props: null,
      },
    ],
    [],
  );
  return (
    <>
      <OutlineComposer plugins={plugins} />
      <div id="composer-actions-root" />
    </>
  );
}

export default OutlineComposerWithPlugins;
