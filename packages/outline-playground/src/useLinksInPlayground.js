/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';

import * as React from 'react';
import {useState, useMemo} from 'react';
import useLinks from './useLinks';

const URLRegex =
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;

function urlMatcher(string: string): ?string {
  return URLRegex.exec(string)?.[0];
}

export default function useLinksInPlayground(editor: OutlineEditor): void {
  useLinks(editor, urlMatcher);
}
