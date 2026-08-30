/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// invariant(condition, message) will refine types based on "condition", and
// if "condition" is false will throw an error. This function is special-cased
// in flow itself, so we can't name it anything else.
//
// In a production build the `transformErrorMessages` Babel plugin replaces
// every call site with a hoisted `if (!cond)` check plus a
// `formatProdErrorMessage(code, ...args)` call, so this body is only reached
// when the source is consumed without that transform (the `source` export
// condition or an untransformed dev build). It must therefore stand on its
// own: interpolate `%s` placeholders against args and throw.
export default function invariant(
  cond?: boolean,
  message = 'Internal Lexical error: invariant() called without a message',
  ...args: string[]
): asserts cond {
  if (cond) {
    return;
  }

  throw new Error(
    args.reduce((msg, arg) => msg.replace('%s', String(arg)), message),
  );
}
