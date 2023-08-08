/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {marked} from 'marked';

// to test if lexical can correctly export markdown that can be
// parsed even by external markdown parsers we will use "marked"
export const generateHtmlFromMarked = (md: string) => {
  // "marked" adds a \n at the end of the HTML string that can ruin tests, so we erase it
  return marked.parse(md, {gfm: true, pedantic: true}).replace('\n', '');
};
