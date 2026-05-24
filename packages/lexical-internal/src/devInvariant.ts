/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * If `!cond`, throw in development like an invariant and warn in prod.
 *
 * A production build rewrites call sites via `transformErrorMessages`
 * (throwing dev message in dev, `formatProdWarningMessage` in prod), so this
 * body is only reached when consumed as untransformed source. It interpolates
 * `%s` placeholders and throws outside production, otherwise warns.
 */
export default function devInvariant(
  cond?: boolean,
  message = 'Internal Lexical error: devInvariant() called without a message',
  ...args: string[]
): void {
  if (cond) {
    return;
  }

  const formatted = args.reduce(
    (msg, arg) => msg.replace('%s', String(arg)),
    message,
  );
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(formatted);
  } else {
    console.warn(formatted);
  }
}
