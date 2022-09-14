/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {NodeProperty} from 'packages/lexical-devtools/types';
import * as React from 'react';

function InspectedElementRow({
  propName,
  property,
}: {
  propName: string;
  property: NodeProperty;
}): JSX.Element {
  let propDisplay = property;

  if (Array.isArray(property)) {
    let arrayChildren = '';
    property.forEach((element, index) => {
      arrayChildren += element;
      if (index !== property.length - 1) arrayChildren += ', ';
    });
    propDisplay = arrayChildren;
  }

  return (
    <div>
      <span className="inspected-element-property-name">{propName}:</span>{' '}
      <span className="inspected-element-property">{propDisplay}</span>
    </div>
  );
}

export default InspectedElementRow;
