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
  const anchor =
    selection && 'anchor' in selection ? (
      <div>
        {'anchor { '}
        <span className="selection-property-name">key:</span>{' '}
        {selection.anchor.key},{' '}
        <span className="selection-property-name">offset:</span>{' '}
        {selection.anchor.offset},{' '}
        <span className="selection-property-name">type:</span>{' '}
        {selection.anchor.type}
        {' }'}
      </div>
    ) : (
      ''
    );
  const focus =
    selection && 'focus' in selection ? (
      <div>
        {'focus { '}
        <span className="selection-property-name">key:</span>{' '}
        {selection.focus.key},{' '}
        <span className="selection-property-name">offset:</span>{' '}
        {selection.focus.offset},{' '}
        <span className="selection-property-name">type:</span>{' '}
        {selection.focus.type}
        {' }'}
      </div>
    ) : (
      ''
    );

  return (
    <div className="selection-view">
      <div className="selection-container">
        {anchor}
        {focus}
      </div>
    </div>
  );
}

export default SelectionView;
