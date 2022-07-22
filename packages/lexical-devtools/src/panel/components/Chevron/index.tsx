/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import * as React from 'react';

function Chevron({
  handleClick,
  isExpanded,
}: {
  handleClick: React.MouseEventHandler;
  isExpanded: boolean;
}): JSX.Element {
  return (
    <button className="chevron-button" onClick={handleClick}>
      {isExpanded ? <>&#x25BC;</> : <>&#9654;</>}
    </button>
  );
}

export default Chevron;
