/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineConfig} from '@pandacss/dev';
import {createPreset} from '@park-ui/panda-preset';
import amber from '@park-ui/panda-preset/colors/amber';
import sand from '@park-ui/panda-preset/colors/sand';

export default defineConfig({
  include: ['./src/**/*.{js,jsx,ts,tsx,vue}'],
  jsxFramework: 'react',
  // or 'solid' or 'vue'
  outdir: 'styled-system',

  preflight: true,
  presets: [createPreset({accentColor: amber, grayColor: sand, radius: 'sm'})],
});
