/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {ReactPortal, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

export type ExcalidrawElementFragment = {
  isDeleted?: boolean;
};

export type Modal = ({
  onClose,
  children,
  title,
  closeOnClickOutside,
}: {
  children: JSX.Element | string | (JSX.Element | string)[];
  closeOnClickOutside?: boolean;
  onClose: () => void;
  title: string;
}) => JSX.Element;

export type Excalidraw = ({
  onChange,
  initialData,
}: {
  onChange: (els: ReadonlyArray<ExcalidrawElementFragment>) => void;
  initialData: {
    appState: {isLoading: boolean};
    elements: ReadonlyArray<ExcalidrawElementFragment>;
  };
}) => JSX.Element;

type ModalProps = {
  closeOnClickOutside?: boolean;
  /**
   * The initial set of elements to draw into the scene
   */
  initialElements: ReadonlyArray<ExcalidrawElementFragment>;
  /**
   * Controls the visibility of the modal
   */
  isShown?: boolean;
  /**
   * Completely remove Excalidraw component
   */
  onDelete: () => void;
  /**
   * Handle modal closing
   */
  onHide: () => void;
  /**
   * Callback when the save button is clicked
   */
  onSave: (elements: ReadonlyArray<ExcalidrawElementFragment>) => void;

  /**
   * Modal component to be used for modals
   */
  Modal: Modal;
  Excalidraw: Excalidraw;
};

const ExcalidrawModalOverlayStyles = {
  alignItems: 'center',
  backgroundColor: 'rgba(40, 40, 40, 0.6)',
  bottom: '0px',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: '0px',
  flexShrink: '1px',
  left: '0px',
  position: 'fixed',
  right: '0px',
  top: '0px',
  zIndex: '100',
} as const;

const ExcalidrawModalActions = {
  position: 'absolute',
  right: '5px',
  textAlign: 'end',
  top: '5px',
  zIndex: '1',
} as const;

const ExcalidrawModalActionButton = {
  backgroundColor: '#fff',
  border: '0',
  borderRadius: '5px',
  color: '#222',
  cursor: 'pointer',
  display: 'inline-block',
  marginLeft: '5px',
  padding: '8px 12px',
  position: 'relative',
} as const;

const ExcalidrawModalDiscardActionButton = {
  ...ExcalidrawModalActionButton,
  backgroundColor: '#eee',
};

const ExcalidrawModalRow = {
  borderRadius: '8px',
  boxShadow:
    '0 12px 28px 0 rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
  height: '70vh',
  padding: '40px 5px 5px',
  position: 'relative',
  width: '70vw',
} as const;

const ExcalidrawModalModal = {
  alignItems: 'center',
  backgroundColor: '#eee',
  borderRadius: '8px',
  display: 'flex',
  justifyContent: 'center',
  left: '0',
  position: 'relative',
  top: '50px',
  width: 'auto',
  zIndex: '10',
} as const;

const ExcalidrawModalDiscardModal = {
  marginTop: '60px',
  textAlign: 'center',
} as const;

/**
 * @explorer-desc
 * A component which renders a modal with Excalidraw (a painting app)
 * which can be used to export an editable image
 */
export default function ExcalidrawModal({
  closeOnClickOutside = false,
  onSave,
  initialElements,
  isShown = false,
  onHide,
  onDelete,
  Modal: ModalEl,
  Excalidraw: ExcalidrawEl,
}: ModalProps): ReactPortal | null {
  const excaliDrawModelRef = useRef(null);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [elements, setElements] =
    useState<ReadonlyArray<ExcalidrawElementFragment>>(initialElements);

  useEffect(() => {
    if (excaliDrawModelRef.current !== null) {
      excaliDrawModelRef.current.focus();
    }
  }, []);

  useEffect(() => {
    let modalOverlayElement: HTMLElement | null = null;
    const clickOutsideHandler = (event: MouseEvent) => {
      const target = event.target;
      if (
        excaliDrawModelRef.current !== null &&
        !excaliDrawModelRef.current.contains(target as Node) &&
        closeOnClickOutside
      ) {
        onDelete();
      }
    };
    if (excaliDrawModelRef.current !== null) {
      modalOverlayElement = excaliDrawModelRef.current?.parentElement;
      if (modalOverlayElement !== null) {
        modalOverlayElement?.addEventListener('click', clickOutsideHandler);
      }
    }

    return () => {
      if (modalOverlayElement !== null) {
        modalOverlayElement?.removeEventListener('click', clickOutsideHandler);
      }
    };
  }, [closeOnClickOutside, onDelete]);

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

  function ShowDiscardDialog(): React.ReactElement {
    return (
      <ModalEl
        title="Discard"
        onClose={() => {
          setDiscardModalOpen(false);
        }}
        closeOnClickOutside={true}>
        Are you sure you want to discard the changes?
        <div style={ExcalidrawModalDiscardModal}>
          <button
            style={ExcalidrawModalDiscardActionButton}
            onClick={() => {
              setDiscardModalOpen(false);
              onHide();
            }}>
            Discard
          </button>{' '}
          <button
            style={ExcalidrawModalDiscardActionButton}
            onClick={() => {
              setDiscardModalOpen(false);
            }}>
            Cancel
          </button>
        </div>
      </ModalEl>
    );
  }

  if (isShown === false) {
    return null;
  }

  const onChange = (els: ReadonlyArray<ExcalidrawElementFragment>) => {
    setElements(els);
  };

  return createPortal(
    <div style={ExcalidrawModalOverlayStyles} role="dialog">
      <div style={ExcalidrawModalModal} ref={excaliDrawModelRef} tabIndex={-1}>
        <div style={ExcalidrawModalRow}>
          {discardModalOpen && <ShowDiscardDialog />}
          <ExcalidrawEl
            onChange={onChange}
            initialData={{
              appState: {isLoading: false},
              elements: initialElements,
            }}
          />
          <div style={ExcalidrawModalActions}>
            <button
              className="action-button"
              style={ExcalidrawModalActionButton}
              onClick={discard}>
              Discard
            </button>
            <button
              className="action-button"
              style={ExcalidrawModalActionButton}
              onClick={save}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
