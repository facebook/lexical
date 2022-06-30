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
      errorCode={'14'}
      errorDescription={
        'One or more transforms are endlessly triggering additional transforms. May have encountered infinite recursion caused by transforms that have their preconditions too lose and/or conflict with each other.'
      }
    />
  );
}
