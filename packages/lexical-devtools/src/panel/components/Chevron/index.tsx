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
  icon,
  handleClick,
}: {
  icon: string;
  handleClick: React.MouseEventHandler;
}): JSX.Element {
  return (
    <button className="chevron-button" onClick={handleClick}>
      {icon}
    </button>
  );
}

export default Chevron;
