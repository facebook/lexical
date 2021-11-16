/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import * as React from 'react';

export default function Placeholder({
  children,
}: {
  children: string,
}): React$Node {
  return <div className="editor-placeholder">{children}</div>;
}
