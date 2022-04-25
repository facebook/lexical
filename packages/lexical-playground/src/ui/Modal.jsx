/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import './Modal.css';

import * as React from 'react';
import {useEffect, useRef} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';

function PortalImpl({
  onClose,
  children,
  title,
}: {
  children: React$Node,
  onClose: () => void,
  title: string,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (modalRef.current !== null) {
      modalRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return (
    <div className="Modal__overlay" role="dialog">
      <div className="Modal__modal" tabIndex={-1} ref={modalRef}>
        <h2 className="Modal__title">{title}</h2>
        <button
          className="Modal__closeButton"
          aria-label="Close modal"
          type="Close"
          onClick={onClose}>
          X
        </button>
        <div className="Modal__content">{children}</div>
      </div>
    </div>
  );
}

export default function Modal({
  onClose,
  children,
  title,
}: {
  children: React$Node,
  onClose: () => void,
  title: string,
}): React$Node {
  return createPortal(
    <PortalImpl onClose={onClose} title={title}>
      {children}
    </PortalImpl>,
    document.body,
  );
}
