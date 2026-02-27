/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import './FilePreview.css';

import * as React from 'react';

export interface FilePreviewProps {
  fileName: string;
  fileSize: string;
  fileType: string;
}

export default function FilePreview({
  fileName,
  fileSize,
  fileType,
}: FilePreviewProps): JSX.Element {
  return (
    <div className="FilePreview__container">
      <div className="FilePreview__item">
        <strong>File:</strong> {fileName}
      </div>
      <div className="FilePreview__item">
        <strong>Size:</strong> {fileSize}
      </div>
      <div className="FilePreview__item">
        <strong>Type:</strong> {fileType}
      </div>
    </div>
  );
}
