/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable strict */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  darkMode: ['class', "html[data-theme='dark']"],
  plugins: [],
  theme: {
    extend: {},
  },
};
