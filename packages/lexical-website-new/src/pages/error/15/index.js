/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* @generated */

import ErrorCodePage from '@site/src/components/ErrorCodePage';
import React from 'react';

export default function ErrorCode() {
  return (
    <ErrorCodePage
      errorCode={'15'}
      errorDescription={
        'Unable to find an active editor state. State helpers or node methods can only be used synchronously during the callback of editor.update() or editorState.read().'
      }
    />
  );
}
