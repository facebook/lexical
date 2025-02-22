/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {EditorThemeClasses} from 'lexical';
import invariant from 'shared/invariant';

export function getThemeSelector(
  getTheme: () => EditorThemeClasses | null | undefined,
  name: keyof EditorThemeClasses,
): string {
  const className = getTheme()?.[name];
  invariant(
    typeof className === 'string',
    'getThemeClass: required theme property %s not defined',
    String(name),
  );
  return className
    .split(/\s+/g)
    .map((cls) => `.${cls}`)
    .join();
}
