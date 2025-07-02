/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { ReactNode } from 'react';
export type Example = {
    description: string;
    title: string;
    uri?: string;
    preview?: string;
    renderPreview?: () => ReactNode;
    tags: Array<string>;
};
export declare const plugins: (customFields: {
    [key: string]: unknown;
}) => Array<Example>;
//# sourceMappingURL=pluginList.d.ts.map