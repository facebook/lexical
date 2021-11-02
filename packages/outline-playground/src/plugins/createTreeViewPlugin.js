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
import {useLayoutEffect, useRef} from 'react';
import OutlineTreeView from 'outline-react/OutlineTreeView';
// $FlowFixMe[cannot-resolve-module] This should be available
import {createPortal} from 'react-dom';

function TreeViewPluginComponent({
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

export default function createTreeViewPlugin(
  targetNode: HTMLElement | null,
): OutlineComposerPlugin<{targetNode: HTMLElement | null}> {
  return {
    name: 'tree-view',
    component: TreeViewPluginComponent,
    props: {targetNode},
  };
}
