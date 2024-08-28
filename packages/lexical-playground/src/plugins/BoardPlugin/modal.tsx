/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './board.css';

import {CSSProperties, useEffect, useState} from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  position?: {top: number; left: number};
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  position,
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value) {
      onSubmit(value);
      setValue('');
    }

    onClose();
  };

  const modalStyle: CSSProperties = position
    ? {
        left: position.left,
        position: 'absolute',
        top: position.top,
      }
    : {};

  return (
    <div className="BoardPlugin__modalBackdrop">
      <div className="BoardPlugin__modalContainer" style={modalStyle}>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={value}
            placeholder={title}
            onChange={(e) => setValue(e.target.value)}
            className="BoardPlugin__modalInput"
            autoFocus={true}
          />
        </form>
      </div>
    </div>
  );
};

export default Modal;
