/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import React from 'react';
import renderer from 'react-test-renderer';

import DropdownColorPicker from '../../src/ui/DropdownColorPicker';

it('Dropdown and ColorPicker part renders correctly', () => {
  const component = renderer.create(
    <DropdownColorPicker
      disabled={false}
      buttonClassName="color-picker"
      buttonAriaLabel="Formatting color"
      buttonIconClassName="icon color"
      color={'#ffffff'}
      onChange={() => {
        //do nothing
      }}
      title="color"
    />,
  );

  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
