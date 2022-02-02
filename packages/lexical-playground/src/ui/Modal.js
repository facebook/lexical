/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe
import {createPortal} from 'react-dom';

import * as React from 'react';
import {useEffect, useRef} from 'react';
import stylex from 'stylex';

const styles = stylex.create({
  overlay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'fixed',
    flexDirection: 'column',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(40, 40, 40, 0.6)',
    flexGrow: 0,
    flexShrink: 1,
    zIndex: 100,
  },
  modal: {
    padding: 20,
    minHeight: 100,
    minWidth: 400,
    display: 'flex',
    flexGrow: 0,
    backgroundColor: '#fff',
    maxHeight: 300,
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 0 20px 0 #444',
    borderRadius: 10,
  },
  title: {
    color: '#444',
    margin: 0,
    paddingBottom: 10,
    borderBottom: '1px solid #ccc',
  },
  closeButton: {
    border: 0,
    position: 'absolute',
    right: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    width: 30,
    height: 30,
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#eee',
    ':hover': {
      backgroundColor: '#ddd',
    },
  },
  content: {
    paddingTop: 20,
    paddingBottom: 20,
  },
});

function PortalImpl({
  onClose,
  children,
  title,
}: {
  onClose: () => void,
  children: React$Node,
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
    <div className={stylex(styles.overlay)} onClick={() => onClose()}>
      <div
        className={stylex(styles.modal)}
        tabIndex={-1}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}>
        <h2 className={stylex(styles.title)}>{title}</h2>
        <button
          className={stylex(styles.closeButton)}
          aria-label="Close modal"
          onClick={() => onClose()}>
          X
        </button>
        <div className={stylex(styles.content)}>{children}</div>
      </div>
    </div>
  );
}

export default function Modal({
  onClose,
  children,
  title,
}: {
  onClose: () => void,
  children: React$Node,
  title: string,
}): React$Node {
  return createPortal(
    <PortalImpl onClose={onClose} title={title}>
      {children}
    </PortalImpl>,
    document.body,
  );
}
