/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {EditorThemeClasses} from 'lexical';

export function getThemeSelector(
  getTheme: () => EditorThemeClasses | null | undefined,
  name: keyof EditorThemeClasses,
): string {
  const className = getTheme()?.[name];
  if (typeof className !== 'string') {
    throw new Error(
      `getThemeClass: required theme property ${name} not defined`,
    );
  }
  return className
    .split(/\s+/g)
    .map((cls) => `.${cls}`)
    .join();
}
