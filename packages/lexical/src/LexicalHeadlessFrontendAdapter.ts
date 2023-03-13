/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {RootListener} from './LexicalEditor';
import {LexicalFrontendAdapter} from './LexicalFrontendAdapter';

export class LexicalHeadlessFrontendAdapter extends LexicalFrontendAdapter {
  isHeadless(): boolean {
    return true;
  }
  registerRootListener(listener: RootListener): () => void {
    return () => {
      // no-op
    };
  }
  getWindow(): Window | null {
    return null;
  }
  getRootElement(): HTMLElement | null {
    return null;
  }
  setRootElement(nextRootElement: HTMLElement | null): void {
    // no-op
  }
  setTemporarilyHeadless(headless: boolean) {
    // no-op
  }
}
