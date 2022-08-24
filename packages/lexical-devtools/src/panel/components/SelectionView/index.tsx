/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {DevToolsSelection} from 'packages/lexical-devtools/types';
import * as React from 'react';

function SelectionView({selection}: {selection: DevToolsSelection | null}) {
  return (
    <div className="selection-view">
      <div className="selection-container">selection view</div>
    </div>
  );
}

export default SelectionView;
