/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PageSetup, PageSize} from './types';

export const PAGE_SIZES: Record<
  PageSize,
  {width: number; height: number; label: string}
> = {
  A3: {height: 1587, label: 'A3 (11.69" x 16.54")', width: 1123},
  A4: {height: 1123, label: 'A4 (8.27" x 11.69")', width: 794},
  A5: {height: 794, label: 'A5 (5.83" x 8.27")', width: 559},
  B4: {height: 1334, label: 'B4 (9.84" x 13.90")', width: 945},
  B5: {height: 945, label: 'B5 (6.93" x 9.84")', width: 665},
  Executive: {height: 1008, label: 'Executive (7.25" x 10.5")', width: 696},
  Folio: {height: 1248, label: 'Folio (8.5" x 13")', width: 816},
  Legal: {height: 1344, label: 'Legal (8.5" x 14")', width: 816},
  Letter: {height: 1056, label: 'Letter (8.5" x 11")', width: 816},
  Statement: {height: 816, label: 'Statement (5.5" x 8.5")', width: 528},
  Tabloid: {height: 1632, label: 'Tabloid (11" x 17")', width: 1056},
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  margins: {
    bottom: 0.4,
    left: 0.4,
    right: 0.4,
    top: 0.4,
  },
  orientation: 'portrait',
  pageSize: 'A4',
};
