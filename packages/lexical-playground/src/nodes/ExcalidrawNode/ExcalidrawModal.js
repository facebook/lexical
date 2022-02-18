/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe: node modules are ignored by flow
import Excalidraw from '@excalidraw/excalidraw';

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import stylex from 'stylex';

type ExcalidrawElementFragment = {
  isDeleted?: boolean,
};

type Props = {
  /**
   * Callback when the save button is clicked
   */
  onSave: ($ReadOnlyArray<ExcalidrawElementFragment>) => mixed,
  /**
   * The initial set of elements to draw into the scene
   */
  initialElements?: $ReadOnlyArray<ExcalidrawElementFragment>,
  /**
   * Controls the visibility of the modal
   */
  isShown?: boolean,
  /**
   * Handle modal closing
   */
  onHide: () => mixed,
  /**
   * Completely remove Excalidraw component
   */
  onDelete: () => boolean,
};

const DEFAULT_INITIAL_ELEMENTS = [];

const styles = stylex.create({
  actions: {
    textAlign: 'end',
    position: 'absolute',
    right: 40,
    top: 35,
    zIndex: 1,
  },
  row: {
    position: 'relative',
    padding: 20,
    width: '70vw',
    height: '70vh',
    borderRadius: 8,
    boxShadow:
      '0 12px 28px 0 rgba(0, 0, 0, 0.2),0 2px 4px 0 rgba(0, 0, 0, 0.1),inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
  },
  modal: {
    position: 'fixed',
    zIndex: 2,
    top: 0,
    width: '100%',
    left: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
  },
});

/**
 * @explorer-desc
 * A component which renders a modal with Excalidraw (a painting app)
 * which can be used to export an editable image
 */
export default function ExcalidrawModal({
  onSave,
  initialElements = DEFAULT_INITIAL_ELEMENTS,
  isShown = false,
  onHide,
  onDelete,
}: Props): React.MixedElement | null {
  const excalidrawRef = useRef(null);
  const [elemenets, setElements] = useState(initialElements);

  const save = () => {
    if (elemenets.filter((el) => !el.isDeleted).length > 0) {
      onSave(elemenets);
    } else {
      // delete node if the scene is clear
      onDelete();
    }
    onHide();
  };

  useEffect(() => {
    excalidrawRef?.current?.updateScene({elements: initialElements});
  }, [initialElements]);

  if (isShown === false) {
    return null;
  }

  const onChange = (els) => {
    setElements(els);
  };

  return (
    <div className={stylex(styles.modal)}>
      <div className={stylex(styles.row)}>
        <Excalidraw
          onChange={onChange}
          initialData={{
            elements: initialElements,
            appState: {isLoading: false},
          }}
        />
        <div className={stylex(styles.actions)}>
          <button className="action-button" onClick={onHide}>
            Discard
          </button>
          <button className="action-button" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
