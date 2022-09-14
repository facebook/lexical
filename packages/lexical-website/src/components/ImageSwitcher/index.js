/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useColorMode} from '@docusaurus/theme-common';
import React from 'react';

export default function ImageSwitcher({light, dark}) {
  const Light = light;
  const Dark = dark;
  const {isDarkTheme} = useColorMode();
  return isDarkTheme ? <Dark /> : <Light />;
}
