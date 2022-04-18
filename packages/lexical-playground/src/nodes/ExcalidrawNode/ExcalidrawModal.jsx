/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe: node modules are ignored by flow
import './ExcalidrawModal.css';

// $FlowFixMe: Flow doesn't have types for Excalidraw
import Excalidraw from '@excalidraw/excalidraw';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';

import Button from '../../ui/Button';
import Modal from '../../ui/Modal';

type ExcalidrawElementFragment = {
  isDeleted?: boolean,
};

type Props = {
  /**
   * The initial set of elements to draw into the scene
   */
  initialElements: $ReadOnlyArray<ExcalidrawElementFragment>,
  /**
   * Controls the visibility of the modal
   */
  isShown?: boolean,
  /**
   * Completely remove Excalidraw component
   */
  onDelete: () => boolean,
  /**
   * Handle modal closing
   */
  onHide: () => mixed,
  /**
   * Callback when the save button is clicked
   */
  onSave: ($ReadOnlyArray<ExcalidrawElementFragment>) => mixed,
};

/**
 * @explorer-desc
 * A component which renders a modal with Excalidraw (a painting app)
 * which can be used to export an editable image
 */
export default function ExcalidrawModal({
  onSave,
  initialElements,
  isShown = false,
  onHide,
  onDelete,
}: Props): React.MixedElement | null {
  const excalidrawRef = useRef(null);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [elements, setElements] =
    useState<$ReadOnlyArray<ExcalidrawElementFragment>>(initialElements);

  const save = () => {
    if (elements.filter((el) => !el.isDeleted).length > 0) {
      onSave(elements);
    } else {
      // delete node if the scene is clear
      onDelete();
    }
    onHide();
  };

  const discard = () => {
    if (elements.filter((el) => !el.isDeleted).length === 0) {
      // delete node if the scene is clear
      onDelete();
    } else {
      //Otherwise, show confirmation dialog before closing
      setDiscardModalOpen(true);
    }
  };

  function ShowDiscardDialog(): React$Node {
    return (
      <Modal
        title="Discard"
        onClose={() => {
          setDiscardModalOpen(false);
        }}>
        Are you sure you want to discard the changes?
        <div className="ExcalidrawModal__discardModal">
          <Button
            onClick={() => {
              setDiscardModalOpen(false);
              onHide();
            }}>
            Discard
          </Button>{' '}
          <Button
            onClick={() => {
              setDiscardModalOpen(false);
            }}>
            Cancel
          </Button>
        </div>
      </Modal>
    );
  }

  useEffect(() => {
    excalidrawRef?.current?.updateScene({elements: initialElements});
  }, [initialElements]);

  if (isShown === false) {
    return null;
  }

  const onChange = (els) => {
    setElements(els);
  };

  // This is a hacky work-around for Excalidraw + Vite.
  // In DEV, Vite pulls this in fine, in prod it doesn't. It seems
  // like a module resolution issue with ESM vs CJS?
  const _Excalidraw =
    Excalidraw.$$typeof != null ? Excalidraw : Excalidraw.default;

  return (
    <div className="ExcalidrawModal__modal">
      <div className="ExcalidrawModal__row">
        {discardModalOpen && <ShowDiscardDialog />}
        <_Excalidraw
          onChange={onChange}
          initialData={{
            appState: {isLoading: false},
            elements: initialElements,
          }}
        />
        <div className="ExcalidrawModal__actions">
          <button className="action-button" onClick={discard}>
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
