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
// $FlowFixMe[cannot-resolve-module] This should be available
import {createPortal} from 'react-dom';

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

function createPlainTextActionButtonsPlugin(
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
export default createPlainTextActionButtonsPlugin;
