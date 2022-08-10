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

import InspectedElementProp from '../InspectedElementProp';

function InspectedElementView({
  nodeProps,
}: {
  nodeProps: NodeProperties | null;
}): JSX.Element {
  const propsDisplay = [];

  if (nodeProps) {
    for (const propName in nodeProps) {
      propsDisplay.push(
        <InspectedElementProp
          propName={propName}
          property={nodeProps[propName]}
        />,
      );
    }
  }

  return <div className="inspected-element-view">{propsDisplay}</div>;
}

export default InspectedElementView;
