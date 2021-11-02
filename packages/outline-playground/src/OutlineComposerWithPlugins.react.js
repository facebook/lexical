/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineComposerPlugin} from 'outline-react/OutlineComposer.react';

import * as React from 'react';
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
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
  outlineProps: {editor, clearEditor, containerElement},
  pluginProps: {isReadOnly, setIsReadOnly},
}): React$Node {
  const domTargetNodeRef = useRef(document.createElement('div'));

  useLayoutEffect(() => {
    const domTargetNode = domTargetNodeRef.current;
    if (domTargetNode != null && containerElement != null) {
      containerElement.appendChild(domTargetNode);
      return () => {
        containerElement.removeChild(domTargetNode);
      };
    }
  });

  return domTargetNodeRef.current != null
    ? createPortal(
        <div className="actions">
          <button
            className="action-button clear"
            onClick={() => {
              clearEditor();
              editor.focus();
            }}>
            Clear
          </button>
          <button
            className="action-button lock"
            onClick={() => setIsReadOnly(!isReadOnly)}>
            <i className={isReadOnly ? 'unlock' : 'lock'} />
          </button>
        </div>,
        domTargetNodeRef.current,
      )
    : null;
}

function createActionButtonPlugin(
  isReadOnly: boolean,
  setIsReadOnly: (boolean) => void,
): OutlineComposerPlugin<{
  isReadOnly: boolean,
  setIsReadOnly: (boolean) => void,
}> {
  return {
    name: 'action-buttons',
    component: ActionButtonsComponent,
    props: {isReadOnly, setIsReadOnly},
  };
}

function EmojiPluginComponent({outlineProps: {editor}}): React$Node {
  useEmojis(editor);
  return null;
}

const EmojiPlugin: OutlineComposerPlugin<null> = {
  name: 'emoji',
  component: EmojiPluginComponent,
  props: null,
};

function TreeViewComponent({
  outlineProps: {editor, containerElement},
  pluginProps: {targetNode},
}): React$Node {
  // instead of passing a target node we can also do this:
  const domTargetNodeRef = useRef(document.createElement('div'));
  // We could probably even create some helper functions to make this easier to portal in/around the container element

  useLayoutEffect(() => {
    const domTargetNode = domTargetNodeRef.current;
    if (
      domTargetNode != null &&
      containerElement != null &&
      containerElement.parentNode != null
    ) {
      containerElement.parentNode.insertBefore(
        domTargetNode,
        containerElement.nextSibling,
      );
      return () => {
        containerElement.parentNode?.removeChild(domTargetNode);
      };
    }
  });

  // // This is another option for determining the portal target
  // return targetNode != null
  //   ? createPortal(
  //       <OutlineTreeView className="tree-view-output" editor={editor} />,
  //       targetNode,
  //     )
  //   : null;

  return domTargetNodeRef.current != null
    ? createPortal(
        <OutlineTreeView className="tree-view-output" editor={editor} />,
        domTargetNodeRef.current,
      )
    : null;
}

function createTreeViewPlugin(
  targetNode: HTMLElement | null,
): OutlineComposerPlugin<{targetNode: HTMLElement | null}> {
  return {
    name: 'tree-view',
    component: TreeViewComponent,
    props: {targetNode},
  };
}

function OutlineComposerWithPlugins({
  showTreeView,
}: {
  showTreeView: boolean,
}): React$Node {
  // TODO: Should this be useStable for the render ref instead?
  const treeViewRenderRef = useRef(document.createElement('div'));
  const treeViewRootRef = useRef();

  const [isReadOnly, setIsReadOnly] = useState(false);

  useLayoutEffect(() => {
    const treeViewRootNode = treeViewRootRef.current;
    const treeViewRenderNode = treeViewRenderRef.current;
    if (treeViewRenderNode != null && treeViewRootNode != null) {
      treeViewRootNode.appendChild(treeViewRenderNode);
      return () => {
        treeViewRootNode.removeChild(treeViewRenderNode);
      };
    }
  }, []);

  const treeViewRenderNode = treeViewRenderRef.current;

  const plugins = useMemo(
    () => [
      EmojiPlugin,
      showTreeView ? createTreeViewPlugin(treeViewRenderNode) : null,
      createActionButtonPlugin(isReadOnly, setIsReadOnly),
    ],
    [isReadOnly, showTreeView, treeViewRenderNode],
  );

  return (
    <>
      <OutlineComposer plugins={plugins} isReadOnly={isReadOnly} />
      <div ref={treeViewRootRef} />
    </>
  );
}

export default OutlineComposerWithPlugins;
