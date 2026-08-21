/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {EditorConfig} from 'lexical';

import {$getDocument} from '../LexicalUtils';
import {ElementNode} from './LexicalElementNode';

// TODO: Cleanup ArtificialNode__DO_NOT_USE #5966
/** @internal */
export class ArtificialNode__DO_NOT_USE extends ElementNode {
  $config() {
    return this.config('artificial', {extends: ElementNode});
  }

  createDOM(config: EditorConfig): HTMLElement {
    // this isnt supposed to be used and is not used anywhere but defining it to appease the API
    const dom = $getDocument().createElement('div');
    return dom;
  }
}
