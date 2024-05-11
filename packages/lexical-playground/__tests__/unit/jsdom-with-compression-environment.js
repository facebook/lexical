/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {TestEnvironment} from 'jest-environment-jsdom';

export default class JSDomWithCompressionEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    Object.assign(this.global, {
      CompressionStream,
      DecompressionStream,
      TextDecoderStream,
      TextEncoder,
    });
  }
}
