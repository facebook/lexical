/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Do not require this module directly! Use normal `invariant` calls with
// template literal strings. The messages will be replaced with error codes
// during build.

export default function formatProdErrorMessage(
  code: string,
  ...args: string[]
): never {
  const url = new URL('https://lexical.dev/docs/error');
  const params = new URLSearchParams();
  params.append('code', code);
  for (const arg of args) {
    params.append('v', arg);
  }
  url.search = params.toString();

  throw Error(
    `Minified Lexical error #${code}; visit ${url.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`,
  );
}
