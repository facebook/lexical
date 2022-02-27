/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {CAN_USE_DOM} from 'shared/canUseDOM';

const getSelection: null | (() => Selection) = CAN_USE_DOM
  ? window.getSelection
  : null;

export default getSelection;
