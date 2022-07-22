/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import * as React from 'react';

function Marker({
  icon,
  handleClick,
}: {
  icon: string;
  handleClick: (event: Event) => void;
}): JSX.Element {
  return (
    <button className="marker-button" onClick={handleClick}>
      {icon}
    </button>
  );
}

export default Marker;
