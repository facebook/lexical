/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import Modal from '../ui/Modal';

import {useCallback, useMemo, useState} from 'react';
import * as React from 'react';

export default function useModal(): [
  React$Node,
  (string, (() => void) => React$Node) => void,
] {
  const [modalContent, setModalContent] = useState<null | {
    content: React$Node,
    title: string,
  }>(null);

  const onClose = useCallback(() => {
    setModalContent(null);
  }, []);

  const modal = useMemo(() => {
    if (modalContent === null) {
      return null;
    }
    const {title, content} = modalContent;
    return (
      <Modal onClose={onClose} title={title}>
        {content}
      </Modal>
    );
  }, [modalContent, onClose]);

  const showModal = useCallback(
    (title, getContent: (() => void) => React$Node) => {
      setModalContent({title, content: getContent(onClose)});
    },
    [onClose],
  );

  return [modal, showModal];
}
