/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {expect} from '@playwright/test';
import prettier from '@prettier/sync';

// This tag function is just used to trigger prettier auto-formatting.
// (https://prettier.io/blog/2020/08/24/2.1.0.html#api)
export function html(
  partials: TemplateStringsArray,
  ...params: string[]
): string {
  let output = '';
  for (let i = 0; i < partials.length; i++) {
    output += partials[i];
    if (i < partials.length - 1) {
      output += params[i];
    }
  }
  return output;
}

export function expectHtmlToBeEqual(expected: string, actual: string): void {
  expect(prettifyHtml(expected)).toBe(prettifyHtml(actual));
}

export function prettifyHtml(s: string): string {
  return prettier.format(s.replace(/\n/g, ''), {parser: 'html'});
}
