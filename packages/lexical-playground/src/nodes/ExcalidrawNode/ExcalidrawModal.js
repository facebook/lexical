/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * @emails oncall+excalidraw
 * @flow strict
 * @format
 */



import type {ExcalidrawElement} from '@excalidraw/excalidraw';

import Excalidraw from '@excalidraw/excalidraw';

import * as React from 'react';
import {useRef, useState} from 'react';
import stylex from 'stylex';

type Props = {
  /**
   * Callback when the save button is clicked
   */
  onSave: ($ReadOnlyArray<ExcalidrawElement>) => mixed,
  /**
   * The initial set of elements to draw into the scene
   */
  initialElements?: $ReadOnlyArray<ExcalidrawElement>,
  /**
   * Controls the visibility of the modal
   */
  isShown?: boolean,
  /**
   * Handle when the modal is hidden. When this prop is not provided, the close icon is hidden.
   */
  onHide: () => mixed,
};

const DEFAULT_INITIAL_ELEMENTS = [];

const styles = stylex.create({
  close: {
    textAlign: 'end',
    position: 'absolute',
    right: 20,
    top: 20,
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
    backgroundColor: 'rgba(255,255,255,.4)',
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
}: Props): React.MixedElement | null {
  const excalidrawRef = useRef(null);
  const close = () => {
    onSave(excalidrawRef?.current?.getSceneElements() ?? []);
    onHide();
  };

  if (isShown === false) {
    return null;
  }

  const onChange = (els) => {
    console.log('onchange', els);
  };

  return (
    <div className={stylex(styles.modal)}>
      <div className={stylex(styles.row)}>
        <Excalidraw
          onChange={onChange}
          ref={excalidrawRef}
          initialData={{elements: initialElements, appState: {}}}
        />
        <div className={stylex(styles.close)}>
          <button onClick={close}>Save</button>
        </div>
      </div>
    </div>
  );
}
