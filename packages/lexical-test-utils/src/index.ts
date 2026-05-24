/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as React from 'react';
import * as ReactTestUtils from 'react-dom/test-utils';

/**
 * React 19 moved act from react-dom/test-utils to react
 * https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-react-dom-test-utils
 */
export const act =
  'act' in React
    ? (React.act as typeof ReactTestUtils.act)
    : ReactTestUtils.act;
