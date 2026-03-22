/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useColorMode} from '@docusaurus/theme-common';
import React from 'react';

interface ImageSwitcherProps {
  light: React.ComponentType;
  dark: React.ComponentType;
}

export default function ImageSwitcher({light, dark}: ImageSwitcherProps) {
  const Light = light;
  const Dark = dark;
  const {isDarkTheme} = useColorMode();
  return isDarkTheme ? <Dark /> : <Light />;
}
