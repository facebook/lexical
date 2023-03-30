/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {PasteCommandType} from 'packages/lexical/src';

import isDOMNode from './isDOMNode';

/**
 * Check if the event's target is an input element
 */
export default function isDOMEventTargetInput(event: PasteCommandType) {
  return (
    isDOMNode(event.target) &&
    (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement)
  );
}
