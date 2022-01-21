/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';

import LexicalAutoLinkPlugin from '@lexical/react/LexicalAutoLinkPlugin';

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_MATCHER =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  (text) => {
    const match = URL_MATCHER.exec(text);
    return (
      match && {
        text: match[0],
        length: match[0].length,
        index: match.index,
        url: match[0],
      }
    );
  },
  (text) => {
    const match = EMAIL_MATCHER.exec(text);
    return (
      match && {
        text: match[0],
        length: match[0].length,
        index: match.index,
        url: `mailto:${match[0]}`,
      }
    );
  },
];

export default function AutoLinkPlugin(): React$Node {
  return <LexicalAutoLinkPlugin matchers={MATCHERS} />;
}
