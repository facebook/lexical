/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export type PageSize =
  | 'Letter'
  | 'Tabloid'
  | 'Legal'
  | 'Statement'
  | 'Executive'
  | 'Folio'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'B4'
  | 'B5';

export type Orientation = 'portrait' | 'landscape';

export interface PageSetup {
  pageSize: PageSize;
  orientation: Orientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
