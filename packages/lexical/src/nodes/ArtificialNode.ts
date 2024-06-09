/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {EditorConfig} from 'lexical';

import {ElementNode} from './LexicalElementNode';

// TODO: Cleanup ArtificialNode__DO_NOT_USE #5966
export class ArtificialNode__DO_NOT_USE extends ElementNode {
  static getType(): string {
    return 'artificial';
  }

  createDOM(config: EditorConfig): HTMLElement {
    // this isnt supposed to be used and is not used anywhere but defining it to appease the API
    const dom = document.createElement('div');
    return dom;
  }
}
