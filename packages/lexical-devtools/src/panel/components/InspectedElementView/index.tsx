/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {NodeProps} from 'packages/lexical-devtools/types';
import * as React from 'react';

function InspectedElementView({
  nodeProps,
}: {
  nodeProps: NodeProps | null;
}): JSX.Element {
  const props = [];

  if (nodeProps) {
    for (const key in nodeProps) {
      props.push(`${key}: ${nodeProps[key]}`);
    }
  }

  return <div className="inspected-element-view">{props}</div>;
}

export default InspectedElementView;
