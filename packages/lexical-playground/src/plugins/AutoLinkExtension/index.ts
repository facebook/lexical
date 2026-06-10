/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode} from '@lexical/code';
import {AutoLinkExtension, createLinkMatcherWithRegExp} from '@lexical/link';
import {configExtension} from 'lexical';

const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*[a-zA-Z0-9@_~#?&//=])?/;

// Bounded quantifiers keep this matcher linear-time. The unbounded form
// (`[^...]+(\.[^...]+)*@...`) backtracks in O(n^2) on a long run of characters
// without an `@`, because `RegExp.exec` retries the local-part scan from every
// offset. The limits below comfortably exceed RFC 5321 maximums (64-char local
// part, 63-char DNS labels) so every valid address still matches.
const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]{1,64}(\.[^<>()[\]\\.,;:\s@"]{1,64}){0,63})|(".{1,255}"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]{1,63}\.){1,127}[a-zA-Z]{2,63}))/;

export const PlaygroundAutoLinkExtension = /* @__PURE__ */ configExtension(
  AutoLinkExtension,
  {
    excludeParents: [$isCodeNode],
    matchers: [
      createLinkMatcherWithRegExp(URL_REGEX, text => {
        return text.startsWith('http') ? text : `https://${text}`;
      }),
      createLinkMatcherWithRegExp(EMAIL_REGEX, text => {
        return `mailto:${text}`;
      }),
    ],
  },
);
