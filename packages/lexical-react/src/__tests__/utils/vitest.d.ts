/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import 'vitest';

// @types/jest-axe augments Jest's matchers, which Vitest 5 no longer inherits.
// Match the return type for both direct and resolves/rejects assertions.
declare module 'vitest' {
  interface Matchers<R extends void | Promise<void>> {
    toHaveNoViolations(): R;
  }
}
