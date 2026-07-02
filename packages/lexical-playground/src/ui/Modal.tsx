/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import './Modal.css';

import {useMergeRefs} from '@floating-ui/react';
import {useLexicalFocusTrapRef} from '@lexical/react/useLexicalFocusTrapRef';
import {isDOMNode, mergeRegister, registerEventListener} from 'lexical';
import * as React from 'react';
import {ReactNode, useEffect, useId, useRef} from 'react';
import {createPortal} from 'react-dom';

function PortalImpl({
  onClose,
  children,
  title,
  closeOnClickOutside,
}: {
  children: ReactNode;
  closeOnClickOutside: boolean;
  onClose: () => void;
  title: string;
}) {
  const modalDomRef = useRef<HTMLDivElement>(null);
  const trapRef = useLexicalFocusTrapRef(true, 'container');
  const modalRef = useMergeRefs([modalDomRef, trapRef]);
  const titleId = useId();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const clickOutsideHandler = (event: MouseEvent) => {
      const target = event.target;
      if (
        modalDomRef.current !== null &&
        isDOMNode(target) &&
        !modalDomRef.current.contains(target) &&
        closeOnClickOutside
      ) {
        onClose();
      }
    };
    const modalOverlayElement = modalDomRef.current?.parentElement ?? null;
    return mergeRegister(
      registerEventListener(window, 'keydown', handler),
      modalOverlayElement
        ? registerEventListener(
            modalOverlayElement,
            'click',
            clickOutsideHandler,
          )
        : () => {},
    );
  }, [closeOnClickOutside, onClose]);

  return (
    <div
      className="Modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}>
      <div className="Modal__modal" tabIndex={-1} ref={modalRef}>
        <h2 className="Modal__title" id={titleId}>
          {title}
        </h2>
        <button
          className="Modal__closeButton"
          aria-label="Close modal"
          type="button"
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
  closeOnClickOutside = false,
}: {
  children: ReactNode;
  closeOnClickOutside?: boolean;
  onClose: () => void;
  title: string;
}): JSX.Element {
  return createPortal(
    <PortalImpl
      onClose={onClose}
      title={title}
      closeOnClickOutside={closeOnClickOutside}>
      {children}
    </PortalImpl>,
    document.body,
  );
}
