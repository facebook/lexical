/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeExtension} from '@lexical/code-core';
import {LinkExtension} from '@lexical/link';
import {ListExtension} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';

/**
 * The nodes the default `TRANSFORMERS` need, as extensions, so that tests
 * build their editor the same way an application does.
 */
export const MarkdownTestExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    ListExtension,
    LinkExtension,
    CodeExtension,
  ],
  name: '@lexical/markdown/test',
});
