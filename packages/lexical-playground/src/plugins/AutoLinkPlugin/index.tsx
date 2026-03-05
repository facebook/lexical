/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {JSX} from 'react';

import {$isCodeNode} from '@lexical/code';
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from '@lexical/react/LexicalAutoLinkPlugin';
import * as React from 'react';

const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)(?<![-.+():%])/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const GH_TAG_REGEX = /GH-\d+/;

const MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, (text) => {
    return text.startsWith('http') ? text : `https://${text}`;
  }),
  createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => {
    return `mailto:${text}`;
  }),
  createLinkMatcherWithRegExp(GH_TAG_REGEX, (text) => {
    return `https://github.com/facebook/lexical/issues/${text.slice(3)}`;
  }),
];

const EXCLUDE_PARENTS = [$isCodeNode];

const IS_SEPARATOR = (char: string) => /[.,;:\s]/.test(char);

export default function LexicalAutoLinkPlugin(): JSX.Element {
  return (
    <AutoLinkPlugin
      matchers={MATCHERS}
      excludeParents={EXCLUDE_PARENTS}
      isSeparator={IS_SEPARATOR}
    />
  );
}
