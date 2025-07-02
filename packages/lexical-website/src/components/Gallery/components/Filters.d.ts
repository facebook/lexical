/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ReactNode } from 'react';
import { Example } from '../pluginList';
import { Tag } from '../tagList';
export default function Filters({ filteredPlugins, tagList, }: {
    filteredPlugins: Array<Example>;
    tagList: {
        [type in string]: Tag;
    };
}): ReactNode;
//# sourceMappingURL=Filters.d.ts.map