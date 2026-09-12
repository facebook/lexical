/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * @param {undefined | string} filename
 * @param {undefined | ReadonlyArray<any>} extraPlugins
 * @param {ReadonlyArray<any>} [basePlugins] Pass-specific defaults.
 * @returns {Array<any>} the Babel parser plugins to parse this file with
 */
export function parserPluginsFor(
  filename,
  extraPlugins,
  basePlugins = ['explicitResourceManagement'],
) {
  const name = typeof filename === 'string' ? filename : '';
  const isTypeScript = /\.[cm]?tsx?$/i.test(name);
  const plugins = [...basePlugins];
  if (isTypeScript) {
    plugins.push('typescript');
  }
  // `<T>(value: T) => value` in a .ts file is a generic arrow function, not
  // an opening JSX element, so the jsx plugin must stay off there. JavaScript
  // files may contain JSX before the downstream compiler transforms it.
  if (!isTypeScript || /\.[cm]?tsx$/i.test(name)) {
    plugins.push('jsx');
  }
  return extraPlugins ? plugins.concat(extraPlugins) : plugins;
}
