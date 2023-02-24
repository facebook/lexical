/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  AutoLinkPlugin,
  emailLinkMatcher,
  urlLinkMatcher,
} from '@lexical/react/LexicalAutoLinkPlugin';
import * as React from 'react';

const MATCHERS = [urlLinkMatcher, emailLinkMatcher];

export default function LexicalAutoLinkPlugin(): JSX.Element {
  return <AutoLinkPlugin matchers={MATCHERS} />;
}
