/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import './ContentEditable.css';

export default function ContentEditable({
  className,
}: {
  className?: string,
}): React$Node {
  return (
    <LexicalContentEditable className={className || 'ContentEditable__root'} />
  );
}
