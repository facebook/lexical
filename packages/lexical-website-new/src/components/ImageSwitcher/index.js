import {useColorMode} from '@docusaurus/theme-common';
import React from 'react';

export default function ImageSwitcher({light, dark}) {
  const Light = light;
  const Dark = dark;
  const {isDarkTheme} = useColorMode();
  return isDarkTheme ? <Dark /> : <Light />;
}
