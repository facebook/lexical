/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {NodeProperties} from 'packages/lexical-devtools/types';
import * as React from 'react';

import InspectedElementRow from '../InspectedElementRow';

function InspectedElementView({
  nodeProps,
}: {
  nodeProps: NodeProperties | null;
}): JSX.Element {
  return (
    <div className="inspected-element-view">
      {nodeProps
        ? Object.entries(nodeProps).map(([key, value]) => (
            <InspectedElementRow propName={key} property={value} />
          ))
        : ''}
    </div>
  );
}

export default InspectedElementView;
