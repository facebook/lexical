/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {DecoratorNode} from 'lexical';

export class PollNode extends DecoratorNode {
  static getType(): string {
    return 'poll';
  }
}
