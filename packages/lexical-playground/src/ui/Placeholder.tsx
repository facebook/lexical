/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './Placeholder.css';

import * as React from 'react';

export default function Placeholder({
  children,
  className,
}: {
  children: JSX.Element | string | (JSX.Element | string)[];
  className?: string;
}): JSX.Element {
  return <div className={className || 'Placeholder__root'}>{children}</div>;
}
