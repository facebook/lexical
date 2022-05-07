/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './ContentEditable.css';

import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import * as React from 'react';

export default function ContentEditable({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <LexicalContentEditable className={className || 'ContentEditable__root'} />
  );
}
