/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export interface DevToolsTree {
  [key: string]: DevToolsNode;
}

export interface DevToolsNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x: string]: any;
  children: Array<DevToolsNode>;
  __text?: string;
  __type: string;
  lexicalKey: string;
}
