/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode} from '@lexical/code';
import {
  AutoLinkExtension,
  createLinkMatcherWithRegExp,
  type LinkMatcher,
} from '@lexical/link';
import {configExtension} from 'lexical';

const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-\p{L}\p{N}@:%._+~#=]{1,256}\.[\p{L}\p{N}]{1,6}(?:[-\p{L}\p{N}()@:%_+.~#?&//=]*[\p{L}\p{N}()@_~#?&//=])?/u;

// Bounded quantifiers keep this matcher linear-time. The unbounded form
// (`[^...]+(\.[^...]+)*@...`) backtracks in O(n^2) on a long run of characters
// without an `@`, because `RegExp.exec` retries the local-part scan from every
// offset. The limits below comfortably exceed RFC 5321 maximums (64-char local
// part, 63-char DNS labels) so every valid address still matches.
const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]{1,64}(\.[^<>()[\]\\.,;:\s@"]{1,64}){0,63})|(".{1,255}"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]{1,63}\.){1,127}[a-zA-Z]{2,63}))/;

export const urlMatcher: LinkMatcher = text => {
  const match = URL_REGEX.exec(text);
  if (match === null) {
    return null;
  }
  let matched = match[0];
  let depth = 0;
  for (const ch of matched) {
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    }
  }
  while (depth < 0 && matched.endsWith(')')) {
    matched = matched.slice(0, -1);
    depth++;
  }
  return {
    index: match.index,
    length: matched.length,
    text: matched,
    url: matched.startsWith('http') ? matched : `https://${matched}`,
  };
};

export const PlaygroundAutoLinkExtension = /* @__PURE__ */ configExtension(
  AutoLinkExtension,
  {
    excludeParents: [$isCodeNode],
    matchers: [
      urlMatcher,
      createLinkMatcherWithRegExp(EMAIL_REGEX, text => {
        return `mailto:${text}`;
      }),
    ],
  },
);
